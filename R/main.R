# wpia-hn.hpc.dide.ic.ac.uk

library(rrq)
library(plumber)
library(porcelain)

asISO8601 <- function(t) strftime(t, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

tasks_list <- function(con) {
  function(queue_id) {
    controller <- rrq_controller(queue_id = queue_id, con = con)

    ids <- rrq_task_list(controller = controller)
    status <- rrq_task_status(ids, controller = controller)
    times <- as.POSIXct(rrq_task_times(ids, controller = controller))
    rownames(times) <- NULL

    tasks <- data.frame(
      id = ids,
      status = status,
      submit = asISO8601(times[, "submit"]),
      start = asISO8601(times[, "start"]),
      complete = asISO8601(times[, "complete"]),
      moved = asISO8601(times[, "moved"])
    )
    list(tasks = tasks)
  }
}

workers_list <- function(con) {
  function(queue_id) {
    controller <- rrq_controller(queue_id = queue_id, con = con)

    # note, rrq_workers_list only returns active workers. There is
    # rrq_workers_list_exited too. The docs for rrq_worker_status says it only
    # returns active workers, but empirically it actually returns all of them.
    status <- rrq_worker_status(controller = controller)

    list(workers = data.frame(
      id = names(status),
      status = unname(status)
    ))
  }
}


endpoint_tasks_list <- function(con) {
  porcelain_endpoint$new(
    "GET", "/tasks", tasks_list(con),
    porcelain_input_query(queue_id = "string"),
    returning = porcelain_returning_json("task_list.json"))
}


endpoint_workers_list <- function(con) {
  porcelain_endpoint$new(
    "GET", "/workers", workers_list(con),
    porcelain_input_query(queue_id = "string"),
    returning = porcelain_returning_json("worker_list"))
}


api <- function(validate, con) {
  api <- porcelain$new(validate = validate)
  api$handle(endpoint_tasks_list(con))
  api$handle(endpoint_workers_list(con))
  api
}

router <- function(validate = FALSE, con = redux::hiredis(), static = system.file("static", package = "rrq.dashboard")) {
  pr() %>%
    pr_mount("/api", api(validate, con)) %>%
    pr_static("/static", static) %>%
    pr_get("/", function(req, res) {
      include_html(file.path(static, "index.html"), res)
    })
}

main <- function(args = commandArgs(TRUE)) {
  usage <- "Usage:
    rrq.dashboard [options]

  Options:
    --port=PORT       Port to run on [default: 8888]
    --validate        Apply JSON validation
  "
  dat <- docopt::docopt(usage, args)

  router(validate = dat$validate)$run("0.0.0.0", as.integer(dat$port))
}

# api()$run()
