const { events, Job } = require("brigadier");

events.on("pull_request", function(e, project) {
  console.log("received push for commit " + e.commit);

  // Create a new job
  var node = new Job("test-runner");

  // We want our job to run the stock Docker Python 3 image
  node.image = "python:3";

  // Now we want it to run these commands in order:
  node.tasks = [
    "cd /src/app",
    "pip install -r requirements.txt",
    "cd /src/",
    "python setup.py test"
  ];

  // We're done configuring, so we run the job
  node
    .run()
    .then(() => {
      ghNotify("success", "Passed", e).run();
    })
    .catch(err => {
      const title = "Tests failed for Test app";
      const msg = "Figure out how to display logs";
      slack = slackNotify("danger", title, msg, e);
      slack.run();
      ghNotify("failure", `failed: ${err.toString()}`, e).run();
    });
});

function ghNotify(state, msg, e) {
  const gh = new Job(`notify-${state}`, "technosophos/github-notify:latest");
  gh.env = {
    GH_REPO: "hackintoshrao/brigade-test",
    GH_STATE: state,
    GH_DESCRIPTION: msg,
    GH_CONTEXT: "brigade",
    GH_TOKEN: "7d266dbae095aedba89e5c3b772972518dc88ef9",
    GH_COMMIT: e.revision.commit
  };
  return gh;
}

var count = 0;

function slackNotify(state, title, msg, e) {
  const slack = new Job(
    `slack-notify-${count}`,
    "technosophos/slack-notify:latest"
  );
  slack.env = {
    SLACK_WEBHOOK:
      "https://hooks.slack.com/services/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",
    SLACK_USERNAME: "Sandeep",
    SLACK_TITLE: "Build Failed",
    SLACK_MESSAGE: "Build failed for this pull request",
    SLACK_COLOR: state
  };
  count++;
  return slack;
}
