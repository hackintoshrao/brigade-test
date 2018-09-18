const { events, Job } = require("brigadier");

events.on("pull_request", function(e, project) {
  console.log("received push for commit " + e.revision.commit);
  console.log("e=",e);
  console.log("project=",project);

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
      ghNotify("success", "Passed", e, project).run();
    })
    .catch(err => {
      const title = "Tests failed for Test app";
      const msg = "Figure out how to display logs";      
      ghNotify("failure", `failed: ${err.toString().substring(0,100)}`, e, project).run();
      slack = slackNotify("danger", title, msg, e);
      slack.run();
    });
});

function dockerBuild(tag, e, project) {
  const img = "technosophos/node-demo"
  const dind = new Job("dind", "docker:stable-dind");
  dind.privileged = true;
  dind.env = {
    DOCKER_DRIVER: "overlay"
  }
  dind.tasks = [
    "dockerd-entrypoint.sh &",
    `printf "waiting for docker daemon"; while ! docker info >/dev/null 2>&1; do printf .; sleep 1; done; echo`,
    "cd /src",
    `docker login -u ${project.secrets.registryUser} -p '${project.secrets.registryToken}' ${project.secrets.registryHost}`,
    `docker build -t ${img}:${tag} .`,
    `docker tag ${img}:${tag} ${img}:latest`,
    `docker push ${img}`
  ];
  return dind;
}


function ghNotify(state, msg, e, project) {
  const gh = new Job(`notify-${state}`, "technosophos/github-notify:latest");
  gh.env = {
    GH_REPO: "hackintoshrao/brigade-test",
    GH_STATE: state,
    GH_DESCRIPTION: msg,
    GH_CONTEXT: "brigade",
    GH_TOKEN: project.repo.token,
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
