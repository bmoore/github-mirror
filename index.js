var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var Git = require('nodegit');
var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
var cloneRepo = require('./lib/clone-repo.js');
var mirrorRepository = require('./lib/mirror-repo.js');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.post('/push/:hash', function(req, res) {

  // Look for the repository in the config.
  var repoName = process.env[req.params.hash];
  if (!repoName) {
    res.status(404).send('Not found');
    return;
  }

  // Make sure the payload has appropriate values.
  var hook = req.body.hook;
  var repo = req.body.repository;
  var signature = req.headers['x-hub-signature'];
  if (!repo || !hook || !signature) {
    res.status(400).send('Bad request');
    return;
  }

  // Verify that the signature is correct with the secret.
  var config_name = repoName.replace('/', '_');
  var hmac = crypto.createHmac('sha1', process.env[config_name+'_secret']);
  var digest = hmac.update(JSON.stringify(req.body)).digest('hex');
  signature = signature.replace(/^sha1=/, '');
  if (repoName !== repo.full_name || digest !== signature) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Mirror the repo
  var localPath = path.join(__dirname, req.params.hash);
  var gitHubCred = Git.Cred.userpassPlaintextNew(process.env[config_name+'_token'], 'x-oauth-basic');
  cloneRepo(repo.clone_url, localPath, gitHubCred)
    .then(function(repository) {
      var sshPublicKey = path.join(__dirname, req.params.hash+'.pub');
      var sshPrivateKey = path.join(__dirname, req.params.hash+'.pem');
      fs.writeFileSync(sshPublicKey, process.env[config_name+'_public']);
      fs.writeFileSync(sshPrivateKey, process.env[config_name+'_private']);
      var credential = function(url, userName) {
        return Git.Cred.sshKeyNew(
          userName,
          sshPublicKey,
          sshPrivateKey,
          '');
      }

      return mirrorRepository(repository, process.env[config_name+'_mirror'], credential);
    })
    .done(function() {
      res.status(200).send('Success');
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
