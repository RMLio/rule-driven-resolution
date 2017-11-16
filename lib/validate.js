/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const http = require('http');
const qs = require("querystring");
const Q = require('q');
const N3 = require('n3');

function validate(mapping) {
  let deferred = Q.defer();

  let options = {
    "method": "POST",
    "hostname": "dia.test.iminds.be",
    "port": "8988",
    "path": "/api/v1/validate",
    "headers": {
      "content-type": "application/x-www-form-urlencoded"
    }
  };

  let req = http.request(options, function (res) {
    let chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      let body = Buffer.concat(chunks);
      let parser = N3.Parser();
      let store = N3.Store();

      console.log(body.toString());

      parser.parse(body.toString(), (err, triple) => {
        if (triple) {
          store.addTriple(triple.subject, triple.predicate, triple.object);
        } else {
          deferred.resolve(store);
        }
      });
    });
  });

  req.write(qs.stringify({mapping}));
  req.end();

  return deferred.promise;
}

module.exports = validate;
