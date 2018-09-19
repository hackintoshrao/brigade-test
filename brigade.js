const { events, Job, Group } = require("brigadier");
const checkRunImage = "technosophos/brigade-github-check-run:latest"

events.on("check_suite:requested", function(e, project){
  slackNotify("danger", "CHECKS_API", "CHECKS_API", e).run();
});
events.on("check_suite:rerequested", function(e, project){
  slackNotify("danger", "CHECKS_API", "CHECKS_API", e).run();
});
events.on("check_run:rerequested", function(e, project){
  slackNotify("danger", "CHECKS_API", "CHECKS_API", e).run();
});

events.on("pull_request", checkRequested);

function checkRequested(e, p) {
  console.log("check requested")
  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "MyService",
    CHECK_TITLE: "Echo Test",
  }

  // This will represent our build job. For us, it's just an empty thinger.
  const build = new Job("build", "alpine:3.7", ["sleep 60", "echo hello"])

  // For convenience, we'll create three jobs: one for each GitHub Check
  // stage.
  const start = new Job("start-run", checkRunImage)
  start.imageForcePull = true
  start.env = env
  start.env.CHECK_SUMMARY = "Beginning test run"

  const end = new Job("end-run", checkRunImage)
  end.imageForcePull = true
  end.env = env

  // Now we run the jobs in order:
  // - Notify GitHub of start
  // - Run the test
  // - Notify GitHub of completion
  //
  // On error, we catch the error and notify GitHub of a failure.
  start.run().then(() => {
    return build.run()
  }).then( (result) => {
    end.env.CHECK_CONCLUSION = "success"
    end.env.CHECK_SUMMARY = "Build completed"
    end.env.CHECK_TEXT = result.toString()
    return end.run()
  }).catch( (err) => {
    // In this case, we mark the ending failed.
    end.env.CHECK_CONCLUSION = "failed"
    end.env.CHECK_SUMMARY = "Build failed"
    end.env.CHECK_TEXT = `Error: ${ err }`
    return end.run()
  })
}

// events.on("pull_request", function(e, project) {
//   console.log("received push for commit " + e.revision.commit);
//   console.log("e=",e);
//   console.log("project=",project);

//   // Create a new job
//   var node = new Job("test-runner");

//   // We want our job to run the stock Docker Python 3 image
//   node.image = "python:3";

//   // Now we want it to run these commands in order:
//   node.tasks = [
//     "cd /src/app",
//     "pip install -r requirements.txt",
//     "cd /src/",
//     "python setup.py test"
//   ];

//   // We're done configuring, so we run the job
//   node
//     .run()
//     .then(() => {
//       ghNotify("success", "Passed", e, project).run();
//       dockerBuild(project).run()
//       .then(()=>{
//         events.emit("build-done", e, project);
//       })
//     })
//     .catch(err => {
//       const title = "Tests failed for Test app";
//       const msg = "Figure out how to display logs";      
//       ghNotify("failure", `failed: ${err.toString().substring(0,100)}`, e, project).run();
//       slack = slackNotify("danger", title, msg, e);
//       slack.run();
//     });
// });

function dockerBuild(project) {
  const img = "spinnakernetflix/flask"
  const dind = new Job("dind", "docker:stable-dind");
  dind.privileged = true;
  dind.env = {
    DOCKER_DRIVER: "overlay"
  }
  dind.tasks = [
    "dockerd-entrypoint.sh &",
    `printf "waiting for docker daemon"; while ! docker info >/dev/null 2>&1; do printf .; sleep 1; done; echo`,
    "cd /src",
    `docker login -u ${project.secrets.dockerLogin} -p ${project.secrets.dockerPassword} `,
    `docker build -t ${img} .`,
    `docker push ${img}`
  ];
  return dind;
}
// events.on("build-done", (e, project) => {
//   var deploy = new Job("deploy-runner", "tettaji/kubectl:1.10.3")

//   deploy.tasks = [
//     "cd /src",
//     //"kubectl apply -f deployment.yaml" // Apply the newly created deploy.yml file
//     "kubectl config get-contexts"
//   ]

//   deploy.run().then( () => {
//     // We'll probably want to do something with a successful deployment later
//     slackNotify("success", "Deployment status", "Flask app successfully deployed", e).run();

//   })
//   .catch(() => {
//     slackNotify("Failed", "Deployment status", "Flask app deployment failed", e).run();
//   })
// })


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
