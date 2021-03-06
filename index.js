const core = require('@actions/core');
const process = require('child_process');

const exec = async (command) => {
  console.log(command)

  await process.exec(command, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) throw new Error(`stderr: ${stderr}`)
    console.log(`stdout: ${stdout}`)
  })
}

const loginHeroku = async () => {
  const login = core.getInput('email');
  const password = core.getInput('api_key');

  try {
    await exec(`echo ${password} | docker login --username=${login} registry.heroku.com --password-stdin`);
    console.log('Logged in succefully ✅');
  } catch (error) {
    core.setFailed(`Authentication process faild. Error: ${error.message}`);
  }
}

 const buildPushAndDeploy = async () => {
  const appName = core.getInput('app_name');
  const dockerFilePath = core.getInput('dockerfile_path');
  const buildOptions = core.getInput('options') || '';
  const herokuAction = herokuActionSetUp(appName);

  try {
    await exec(`cd ${dockerFilePath}`);

    await exec(`docker build . ${buildOptions} --tag registry.heroku.com/${appName}/web`);
    console.log('Image built 🛠');

    await exec(`docker push registry.heroku.com/${appName}/web`);
    console.log('Container pushed to Heroku Container Registry ⏫');

    await exec(herokuAction('release'));
    console.log('App Deployed successfully 🚀');
  } catch (error) {
    core.setFailed(`Something went wrong building your image. Error: ${error.message}`);
  }
}

/**
 *
 * @param {string} appName - Heroku App Name
 * @returns {function}
 */
function herokuActionSetUp(appName) {
  /**
   * @typedef {'push' | 'release'} Actions
   * @param {Actions} action - Action to be performed
   * @returns {string}
   */
  return function herokuAction(action) {
    const HEROKU_API_KEY = core.getInput('api_key');
    const exportKey = `HEROKU_API_KEY=${HEROKU_API_KEY}`;

    return `${exportKey} heroku container:${action} web --app ${appName}`
  }
}

loginHeroku()
  .then(() => buildPushAndDeploy())
  .catch((error) => {
    console.log({ message: error.message });
    core.setFailed(error.message);
  })
