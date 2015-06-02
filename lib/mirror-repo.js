var Git = require('nodegit');
var path = require('path');

function mirrorRepo(repository, mirror, credentials) {
  // Create anonymous remote
  return Git.Remote.createAnonymous(repository, mirror, '+refs/*:refs/*') 
    .then(function(remote) { 
      // Set the credentials
      remote.setCallbacks({ 
        credentials: credentials 
      }); 

      return Git.Reference.list(repository).then(function(refs) { 
        // Get the reference list.
        return refs.filter(function(ref) { 
          return ref.indexOf('head') > -1 || ref.indexOf('tags') > -1; 
        }); 
      }).then(function(refs) { 
        // Build the refspec list.
        return refs.map(function(ref) { 
          return '+'+ref+':'+ref; 
        }); 
      }).then(function(refs) { 
        return remote.push(refs, null, Git.Signature.now('Brian Moore', 'brian@thirdandgrove.com')); 
      }); 
    });
}

module.exports = mirrorRepo;
