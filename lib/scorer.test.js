/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const assert          = require('chai').assert;
const Scorer = require('./scorer.js');
const fs              = require('fs');
const N3              = require('n3');
const Q               = require('q');
const namespaces      = require('prefix-ns').asMap();
const normalizeRML    = require('normalize-rml').normalizeRml;

function doIt(input, termMap, effects, inconsistencies){
  const mapping = fs.readFileSync(input, 'utf-8');
  const deferred = Q.defer();
  const parser = N3.Parser();
  const mappingStore = N3.Store();

  parser.parse(mapping, (err, triple) => {
    if (triple) {
      mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      normalizeRML(mappingStore, () => {
        //console.log(mappingStore.getTriples('_:b2', null, ));
        let scorer = new Scorer(mappingStore, inconsistencies, effects);

        deferred.resolve(scorer.getScore(termMap));
      });
    }
  });

  return deferred.promise;
}

describe('Scorer', function () {
  it.only('1', () => {
    const input = './mappings/rdfs-domain.rml.ttl';
    const termMap = 'http://example.com/#PredicateMap';
    const effects = {'http://example.com/#PredicateMap': [
        'http://example.com/#OM2',
        'http://example.com/#ObjectMap'],
      'http://example.com/#ObjectMap': [
        'http://example.com/#PredicateMap']};
    const inconsistencies = [
      {rules: ['http://example.com/#ObjectMap']},
      {rules: ['http://example.com/#PredicateMap', 'http://example.com/#ObjectMap']}
    ];

    return doIt(input, termMap, effects, inconsistencies).then((result) => {
      console.log(result);
      //assert.deepEqual(result, expectedResult);
    })
  });

  it.only('2', () => {
    const input = './mappings/rdfs-domain.rml.ttl';
    const termMap = 'http://example.com/#ObjectMap';
    const effects = {'http://example.com/#PredicateMap': [
        'http://example.com/#OM2',
        'http://example.com/#ObjectMap'],
      'http://example.com/#ObjectMap': [
        'http://example.com/#PredicateMap']};
    const inconsistencies = [
      {rules: ['http://example.com/#ObjectMap']},
      {rules: ['http://example.com/#PredicateMap', 'http://example.com/#ObjectMap']}
    ];

    return doIt(input, termMap, effects, inconsistencies).then((result) => {
      console.log(result);
      //assert.deepEqual(result, expectedResult);
    })
  });
});