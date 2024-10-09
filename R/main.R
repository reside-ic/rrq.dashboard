# wpia-hn.hpc.dide.ic.ac.uk

asISO8601 <- function(t) strftime(t, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

get_controller <- function(con, controller_id) {
  key <- sprintf("%s:configuration", controller_id)
  if (!as.logical(con$EXISTS(key))) {
    porcelain::porcelain_stop(
      sprintf("rrq controller %s does not exist", controller_id),
      status_code = 404L)
  }
  rrq::rrq_controller(queue_id = controller_id, con = con)
}

redis_scan <- function(con, pattern) {
  idx <- 0
  values <- list()
  while (TRUE) {
    data <- con$SCAN(idx, pattern)
    idx <- as.integer(data[[1]])
    values <- c(values, data[[2]])
    if (idx == 0) {
      return(unlist(values))
    }
  }
}

target_controller_list <- function(con) {
  function() {
    keys <- redis_scan(redux::hiredis(), "rrq:*:configuration")
    controllers <- sub("(.*):configuration$", "\\1", keys)
    list(controllers = data.frame(id = controllers))
  }
}

#' @importFrom dplyr mutate across ends_with arrange desc everything
target_task_list <- function(con) {
  function(controller_id) {
    controller <- get_controller(con, controller_id)

    ids <- rrq::rrq_task_list(controller = controller)

    redis <- redux::redis
    data <- tibble::as_tibble(con$pipeline(
      status = redis$HMGET(controller$keys$task_status, ids),
      queue = redis$HMGET(controller$keys$task_queue, ids),
      local = redis$HMGET(controller$keys$task_local, ids),
      pid = redis$HMGET(controller$keys$task_pid, ids),
      worker_id = redis$HMGET(controller$keys$task_worker, ids),
      submit_time = redis$HMGET(controller$keys$task_time_submit, ids),
      start_time = redis$HMGET(controller$keys$task_time_start, ids),
      complete_time = redis$HMGET(controller$keys$task_time_complete, ids),
      moved_time = redis$HMGET(controller$keys$task_time_moved, ids)))

    data <- data |>
      tibble::add_column(id = ids) |>
      tidyr::unnest(everything(), keep_empty = TRUE, ptype = character()) |>
      mutate(across(local, as.logical)) |>
      mutate(across(pid, as.integer)) |>
      mutate(across(ends_with("_time"), as.numeric)) |>
      arrange(desc(submit_time)) |>
      mutate(across(ends_with("_time"), asISO8601))

    return (list(tasks=data))
  }
}

target_worker_list <- function(con) {
  function(controller_id) {
    controller <- get_controller(con, controller_id)

    # rrq_workers_list only returns active workers. There is
    # rrq_workers_list_exited too. The docs for rrq_worker_status says it only
    # returns active workers, but empirically it actually returns all of them.
    status <- rrq::rrq_worker_status(controller = controller)
    info <- unname(rrq::rrq_worker_info(names(status), controller = controller))

    list(workers = data.frame(
      id = names(status),
      status = unname(status),
      hostname = vapply(info, function(i) i$hostname, character(1)),
      username = vapply(info, function(i) i$username, character(1)),
      platform = vapply(info, function(i) i$platform, character(1))
    ))
  }
}


endpoint_controller_list <- function(con) {
  porcelain::porcelain_endpoint$new(
    "GET", "/controllers", target_controller_list(con),
    returning = porcelain::porcelain_returning_json("controller_list.json"))
}


endpoint_task_list <- function(con) {
  porcelain::porcelain_endpoint$new(
    "GET", "/controller/<controller_id>/tasks", target_task_list(con),
    returning = porcelain::porcelain_returning_json("task_list.json"))
}


endpoint_worker_list <- function(con) {
  porcelain::porcelain_endpoint$new(
    "GET", "/controller/<controller_id>/workers", target_worker_list(con),
    returning = porcelain::porcelain_returning_json("worker_list"))
}


api <- function(validate, con) {
  api <- porcelain::porcelain$new(validate = validate)
  api$handle(endpoint_controller_list(con))
  api$handle(endpoint_task_list(con))
  api$handle(endpoint_worker_list(con))
  api
}

configure_cors <- function(r, allow_all_origins) {
  filter <- function(req, res) {
    res$setHeader("Access-Control-Allow-Origin", "*")

    if (req$REQUEST_METHOD == "OPTIONS") {
      res$setHeader("Access-Control-Allow-Methods","*")
      res$setHeader("Access-Control-Allow-Headers", req$HTTP_ACCESS_CONTROL_REQUEST_HEADERS)
      res$status <- 200 
      return(list())
    } else {
      plumber::forward()
    }
  }

  if (allow_all_origins) {
    plumber::pr_filter(r, "cors", filter)
  } else {
    r
  }

}

router <- function(
  validate = FALSE,
  con = redux::hiredis(),
  static = NULL,
  base_path = NULL,
  allow_all_origins = FALSE)
{
  if (is.null(static)) {
    static <- system.file("static", package = "rrq.dashboard")
  }
  r <- plumber::pr() |> configure_cors(allow_all_origins)
  r <- r |> plumber::pr_mount("/api", api(validate, con))

  if (!is.null(static)) {
    r <- r |>
      plumber::pr_static("/static", static) |>
      plumber::pr_get("/", function(req, res) {
        plumber::include_html(file.path(static, "index.html"), res)
      })
  }

  if (!is.null(base_path) && base_path != "/") {
    r <- plumber::pr() |> plumber::pr_mount(base_path, r)
  }
}

#' Main entrypoint.
#' @export
main <- function(args = commandArgs(TRUE)) {
  usage <- "Usage:
    rrq.dashboard [options]

  Options:
    --port=PORT          Port to run on [default: 8888]
    --static=PATH        Path to the static files to serve
    --allow-all-origins  Allow requests from any origin
    --base-path=PATH     The relative path at which the server is accessible
  "
  dat <- docopt::docopt(usage, args)

  r <- router(
    validate = TRUE,
    static = dat$static,
    allow_all_origins = dat$allow_all_origins,
    base_path = dat$base_path)

  r$run("0.0.0.0", as.integer(dat$port))
}
