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
  node.run().catch(err => {
    const title = "Tests failed for Test app";
    const msg = "Figure out how to display logs";
    slack = slackNotify("danger", title, msg, e);
    slack.run();
  });
});

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
