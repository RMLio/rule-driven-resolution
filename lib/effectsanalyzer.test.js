/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const assert          = require('chai').assert;
const EffectsAnalyzer = require('./effectsanalyzer.js');
const fs              = require('fs');
const N3              = require('n3');
const Q               = require('q');
const namespaces      = require('prefix-ns').asMap();

function doIt(input, termMap, element){
  const mapping = fs.readFileSync(input, 'utf-8');
  const deferred = Q.defer();
  const parser = N3.Parser();
  const mappingStore = N3.Store();

  parser.parse(mapping, (err, triple) => {
    if (triple) {
      mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      let analyzer = new EffectsAnalyzer(mappingStore);

      deferred.resolve(analyzer.getEffects(termMap, element));
    }
  });

  return deferred.promise;
}

describe('EffectsAnalyzer', function () {
  describe('PM', () => {
    it('rr:constant', () => {
      const input = './mappings/rdfs-domain.rml.ttl';
      const termMap = 'http://example.com/#PredicateMap';
      const element = namespaces.rr + 'constant';
      const expectedResult = [
        'http://example.com/#SubjectMap',
        'http://example.com/#ObjectMap' ];

      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      })
    });

    it('rml:reference', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#PM3';
      const element = namespaces.rml + 'reference';
      const expectedResult = [
        'http://example.com/#SubjectMap',
        'http://example.com/#OM3',
        'http://example.com/#OM5' ];

      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result.sort(), expectedResult.sort());
      })
    });

    it('rr:template', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#PM4';
      const element = namespaces.rr + 'template';
      const expectedResult = [
        'http://example.com/#SubjectMap',
        'http://example.com/#OM4',
        'http://example.com/#OM5'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result.sort(), expectedResult.sort());
      })
    });
  });

  describe('OM', () => {
    it('rr:constant rdf:type', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM5';
      const element = namespaces.rr + 'constant';
      const expectedResult = [
        'http://example.com/#PredicateMap',
        'http://example.com/#PM2',
        'http://example.com/#PM3',
        'http://example.com/#PM4',
        'http://example.com/#PM5',
        'http://example.com/#OM5',
        'http://example.com/#SubjectMap',
      ];

      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result.sort(), expectedResult.sort());
      })
    });

    it('rml:reference', () => {
      const input = './mappings/rdfs-domain.rml.ttl';
      const termMap = 'http://example.com/#ObjectMap';
      const element = namespaces.rml + 'reference';
      const expectedResult = [
        'http://example.com/#PredicateMap'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      })
    });

    it('rr:constant', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM4';
      const element = namespaces.rr + 'constant';
      const expectedResult = [
        'http://example.com/#PM4'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      })
    });

    it('rr:template', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM3';
      const element = namespaces.rr + 'template';
      const expectedResult = [
        'http://example.com/#PM3'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      });
    });

    it('rr:datatype', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM4';
      const element = namespaces.rr + 'datatype';
      const expectedResult = [
        'http://example.com/#PM4'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      });
    });

    it('rr:language', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM3';
      const element = namespaces.rr + 'language';
      const expectedResult = [
        'http://example.com/#PM3'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      });
    });

    it('rr:termType', () => {
      const input = './mappings/effects.rml.ttl';
      const termMap = 'http://example.com/#OM5';
      const element = namespaces.rr + 'termType';
      const expectedResult = [
        'http://example.com/#PM5'];


      return doIt(input, termMap, element).then((result) => {
        //console.log(result);
        assert.deepEqual(result, expectedResult);
      });
    });
  });

  it('SM + rr:class', () => {
    const input = './mappings/effects.rml.ttl';
    const termMap = 'http://example.com/#SubjectMap';
    const element = namespaces.rr + 'class';
    const expectedResult = [
      'http://example.com/#PredicateMap',
      'http://example.com/#PM2',
      'http://example.com/#PM3',
      'http://example.com/#PM4',
      'http://example.com/#PM5',
      'http://example.com/#OM5'
    ];

    return doIt(input, termMap, element).then((result) => {
      //console.log(result);
      assert.deepEqual(result.sort(), expectedResult.sort());
    })
  });
});