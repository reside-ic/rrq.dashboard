asISO8601 <- function(t) strftime(t, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

get_controller_keys <- function(con, controller_id) {
  keys <- rrq:::rrq_keys(controller_id)
  if (!as.logical(con$EXISTS(keys$configuration))) {
    porcelain::porcelain_stop(
      sprintf("rrq controller %s does not exist", controller_id),
      status_code = 404L)
  }
  keys
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

pipeline_check <- function(result) {
  for (v in result) {
    if (inherits(v, "redis_error")) {
      stop(v)
    }
  }
  invisible(result)
}

#' @importFrom dplyr mutate across ends_with arrange desc everything
target_task_list <- function(con) {
  function(controller_id) {
    keys <- get_controller_keys(con, controller_id)

    ids <- unlist(con$HKEYS(keys$task_expr))
    if (length(ids) == 0) {
      return(list(tasks=list()))
    }

    redis <- redux::redis
    data <- tibble::as_tibble(pipeline_check(con$pipeline(
      status = redis$HMGET(keys$task_status, ids),
      queue = redis$HMGET(keys$task_queue, ids),
      local = redis$HMGET(keys$task_local, ids),
      pid = redis$HMGET(keys$task_pid, ids),
      worker_id = redis$HMGET(keys$task_worker, ids),
      submit_time = redis$HMGET(keys$task_time_submit, ids),
      start_time = redis$HMGET(keys$task_time_start, ids),
      complete_time = redis$HMGET(keys$task_time_complete, ids),
      moved_time = redis$HMGET(keys$task_time_moved, ids))))

    data <- data |>
      tibble::add_column(id = ids) |>
      tidyr::unnest(everything(), keep_empty = TRUE, ptype = character()) |>
      mutate(across(local, as.logical)) |>
      mutate(across(pid, as.integer)) |>
      mutate(across(ends_with("_time"), as.numeric)) |>
      arrange(desc(submit_time)) |>
      mutate(across(ends_with("_time"), asISO8601))

    list(tasks=data)
  }
}

#' @importFrom dplyr mutate select ungroup rowwise
target_worker_list <- function(con) {
  function(controller_id) {
    keys <- get_controller_keys(con, controller_id)

    ids <- unlist(con$SMEMBERS(keys$worker_id))
    if (length(ids) == 0) {
      return(list(workers=list()))
    }

    redis <- redux::redis
    data <- tibble::as_tibble(pipeline_check(con$pipeline(
      status = redis$HMGET(keys$worker_status, ids),
      info = redis$HMGET(keys$worker_info, ids)
    ))) |> tidyr::unchop(status)

    data <- data |>
      tibble::add_column(id = ids) |>
      rowwise() |>
      mutate(as.data.frame(redux::bin_to_object(info))) |>
      mutate(start_time = {
        k <- rrq:::rrq_key_worker_log(keys$queue_id, id)
        log <- rrq:::worker_log_parse(con$LINDEX(k, 0), id)
        asISO8601(log$time)
      }) |>
      ungroup() |>
      select(c(id, status, hostname, username, platform, start_time))

    list(workers = data)
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
