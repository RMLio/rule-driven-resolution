const assert = require('chai').assert;
const validate = require('./validate');
const Analyzer = require('./analyzer.js');
const fs = require('fs');
const N3 = require('n3');
const Q = require('q');

function doIt(input){
  const mapping = fs.readFileSync(input, 'utf-8');
  const deferred = Q.defer();

  validate(mapping).then((store) => {
    let parser = N3.Parser();
    let mappingStore = N3.Store();

    parser.parse(mapping, (err, triple) => {
      if (triple) {
        mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
      } else {
        let analyzer = new Analyzer(store, mappingStore);

        deferred.resolve(analyzer.analyze());
      }
    });
  });

  return deferred.promise;
}

describe('RDFUnit', function () {
  it('onelang', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#ObjectMap","termMap":"http://example.com/#OM2","element":"http://www.w3.org/ns/r2rml#language"},{"termMapType":"http://www.w3.org/ns/r2rml#ObjectMap","termMap":"http://example.com/#OM1","element":"http://www.w3.org/ns/r2rml#language"}],"rdfunitCode":"ONELANG"}];

    return doIt('./mappings/onelang.rml.ttl').then((result) => {
      assert.deepEqual(result, expectedResult);
    })
  });
});