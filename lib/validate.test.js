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

  it('owlasymp', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM1","element":"http://www.w3.org/ns/r2rml#predicate"},{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM2","element":"http://www.w3.org/ns/r2rml#predicate"}],"rdfunitCode":"OWL-ASYMP"},{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM2","element":"http://www.w3.org/ns/r2rml#predicate"},{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM1","element":"http://www.w3.org/ns/r2rml#predicate"}],"rdfunitCode":"OWL-ASYMP"}];

    return doIt('./mappings/owlasymp.rml.ttl').then((result) => {
      assert.deepEqual(result, expectedResult);
    })
  });

  it('typedep', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"},{"termMapType":"http://www.w3.org/ns/r2rml#TriplesMap","termMap":"http://example.com/#Person","type":"change","element":"http://www.w3.org/ns/r2rml#predicateObjectMap"}],"rdfunitCode":"TYPEDEP"}];

    return doIt('./mappings/typedep.rml.ttl').then((result) => {
      assert.deepEqual(result, expectedResult);
    })
  });

  it('typro-dep', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"},{"termMapType":"http://www.w3.org/ns/r2rml#TriplesMap","termMap":"http://example.com/#Person","type":"change","element":"http://www.w3.org/ns/r2rml#predicateObjectMap"}],"rdfunitCode":"TYPRO-DEP"}];

    return doIt('./mappings/typro-dep.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('rdfs-domain', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateMap","termMap":"http://example.com/#PredicateMap","element":"http://www.w3.org/ns/r2rml#constant","type":"change"},{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"}],"rdfunitCode":"RDFS-DOMAIN"}];

    return doIt('./mappings/rdfs-domain.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it.skip('rdfs-range', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateMap","termMap":"http://example.com/#PredicateMap","element":"http://www.w3.org/ns/r2rml#constant","type":"change"},{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"}],"rdfunitCode":"RDFS-DOMAIN"}];

    return doIt('./mappings/rdfs-range.rml.ttl').then((result) => {
      console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('rdfs-ranged', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#ObjectMap","termMap":"http://www.example.com/#ObjectMap1","element":"http://www.w3.org/ns/r2rml#datatype","type":"change"},{"termMapType":"http://www.w3.org/ns/r2rml#PredicateMap","termMap":"http://www.example.com/#PredicateMap","element":"http://www.w3.org/ns/r2rml#constant","type":"change"}],"rdfunitCode":"RDFS-RANGED"}];

    return doIt('./mappings/rdfs-ranged.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('owldisjc', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"}],"rdfunitCode":"OWLDISJC"},{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"}],"rdfunitCode":"OWLDISJC"}];

    return doIt('./mappings/owldisjc.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('owldisjc 2', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#ObjectMap","termMap":"http://example.com/#OM","element":"http://www.w3.org/ns/r2rml#constant","type":"change"}],"rdfunitCode":"OWLDISJC"},{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class","type":"change"}],"rdfunitCode":"OWLDISJC"}];

    return doIt('./mappings/owldisjc-2.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('owldisjp', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM2","element":"http://www.w3.org/ns/r2rml#predicate"}],"rdfunitCode":"OWLDISJP"},{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM1","element":"http://www.w3.org/ns/r2rml#predicate"}],"rdfunitCode":"OWLDISJP"}];

    return doIt('./mappings/owldisjp.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });

  it('owlirrefl', () => {
    const expectedResult = [{"possibleActions":[{"termMapType":"http://www.w3.org/ns/r2rml#SubjectMap","termMap":"http://example.com/#SubjectMap","element":"http://www.w3.org/ns/r2rml#class"},{"termMapType":"http://www.w3.org/ns/r2rml#PredicateObjectMap","termMap":"http://example.com/#POM3","element":"http://www.w3.org/ns/r2rml#predicate"}],"rdfunitCode":"OWL-IRREFL"}];

    return doIt('./mappings/owlirrefl.rml.ttl').then((result) => {
      //console.log(JSON.stringify(result));
      assert.deepEqual(result, expectedResult);
    })
  });
});