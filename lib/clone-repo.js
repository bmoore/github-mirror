var Git = require('nodegit');

function cloneRepo(url, path, cred) {
  var options = {};
  options.remoteCallbacks = {
    certificateCheck: function() { return 1; },
    credentials: function(url, userName) { 
      return cred;
    },
  };

  var repo = Git.Clone(url, path, options)
  .catch(function() {
    return Git.Repository.open(path);
  });

  return repo;
}

module.exports = cloneRepo;
