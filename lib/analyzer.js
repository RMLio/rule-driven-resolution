/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();
namespaces.rlog = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#';
namespaces.rut = 'http://rdfunit.aksw.org/ns/core#';
namespaces.cs = 'http://vocab.org/changeset/schema#';
namespaces.ns1 = 'http://www.ournicecode.org#';

class Analyzer {

  constructor(validationStore, mappingStore){
    this.validationStore = validationStore;
    this.mappingStore = mappingStore;
    this.violations = [];
  }

  analyze() {
    let result = this.validationStore.getTriples(null, namespaces.rlog + 'hasCode');
    console.log(result);

    result.forEach(r => {
      let resources = this.validationStore.getTriples(r.subject, namespaces.rlog + 'resource').map(a => a.object);
      let processFn;
      let violation = {
        possibleChanges: []
      };

      switch (r.object) {
        case namespaces.ns1 + 'codeDatatype':
          violation.rdfunitCode = 'RDFS-RANGD';
          processFn = Analyzer._processRDFS_RANGD;
          break;
        case namespaces.ns1 + 'codeDomain':
          violation.rdfunitCode = 'RDFS-DOMAIN';
          processFn = this._processRDFS_DOMAIN;
          break;
        case namespaces.ns1 + 'codeDisjoint':
          violation.rdfunitCode = 'OWLDISJC';
          processFn = Analyzer._processOWLDISJC;
          break;
      }

      if (processFn) {
        resources.forEach(resource => {
          let subjectOfChange = this.validationStore.getTriples(resource, namespaces.rdf + 'subject')[0].object;
          let termMapType = this.mappingStore.getTriples(subjectOfChange, namespaces.rdf + 'type').map(a => a.object)[0];

          let change = {
            termMapType,
            termMap: subjectOfChange
          };

          switch (r.object) {
            case namespaces.ns1 + 'codeDatatype':
              processFn(termMapType, subjectOfChange, change);
              break;
          }

          violation.possibleChanges.push(change);
        });
      }

      this.violations.push(violation);
    });

    console.log(JSON.stringify(this.violations));
  }

  getEffectsOfSingleChange(termMap, element) {
    let termMapType = this.mappingStore.getTriples(termMap, namespaces.rdf + 'type')[0].object;

    if (termMapType === namespaces.rr + 'ObjectMap') {
      if (element === namespaces.rr + 'datatype') {
        return this._getEffectOfChangingDatatypeOfObjectMap(termMap);
      }
    } else if (termMapType === namespaces.rr + 'Predicatemap') {
      if (element === namespaces.rr + 'predicate') {
        return this._getEffectOfChangingPredicateOfPredicateMap(termMap);
      }
    }
  }

  static _processRDFS_RANGD(termMapType, termMap, change) {
    switch (termMapType) {
      case namespaces.rr + 'ObjectMap':
        change.element = namespaces.rr + 'datatype';
        break;
      case namespaces.rr + 'PredicateMap':
        change.element = namespaces.rr + 'predicate';
        break;
    }
  }

  _processRDFS_DOMAIN(termMapType, termMap, change) {
    switch (termMapType) {
      case namespaces.rr + 'SubjectMap':
        change.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        change.element = namespaces.rr + 'predicate';
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        if (this.mappingStore.getTriples(termMap, namespaces.rr + 'constant').length > 0) {
          change.element = namespaces.rr + 'constant';
        } else if (this.mappingStore.getTriples(termMap, namespaces.rr + 'template').length > 0) {
          change.element = namespaces.rr + 'template';
        } else {
          change.element = namespaces.rml + 'reference';
        }
        break;
    }
  }

  static _processOWLDISJC(termMapType, termMap, change) {
    switch (termMapType) {
      case namespaces.rr + 'SubjectMap':
        change.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        if (this.mappingStore.getTriples(termMap, namespaces.rr + 'constant').length > 0) {
          change.element = namespaces.rr + 'constant';
        } else if (this.mappingStore.getTriples(termMap, namespaces.rr + 'template').length > 0) {
          change.element = namespaces.rr + 'template';
        } else {
          change.element = namespaces.rml + 'reference';
        }
        break;
    }
  }

  _getEffectOfChangingDatatypeOfObjectMap(objectMap) {
    let pom = this._findPredicateObjectMapOfObjectMap(objectMap);
    let pm = this._findPredicateMapOfPredicateObjectMap(pom);

    return [{
      termMapType: namespaces.rr + 'PredicateMap',
      termMap: pm,
      elements: [namespaces.rr + 'predicate']
    }];
  }

  _getEffectOfChangingPredicateOfPredicateMap(predicateMap) {
    let pom = this._findPredicateObjectMapOfPredicateMap(predicateMap);
    let om = this._findObjectMapOfPredicateObjectMap(pom);
    let tm = this._findTriplesMapOfPredicateObjectMap(pom);
    let sm = this._findSubjectMapOfTriplesMap(tm);

    return [{
      termMapType: namespaces.rr + 'ObjectMap',
      termMap: om,
      elements: [namespaces.rr + 'datatype', namespaces.rr + 'language']
    },{
      termMapType: namespaces.rr + 'SubjectMap',
      termMap: sm,
      elements: [namespaces.rr + 'class']
    }];
  }

  _findSubjectMapOfTriplesMap(triplesMap) {
    return this.mappingStore.getTriples(triplesMap, namespaces.rr + 'subjectMap', null)[0].object;
  }

  _findTriplesMapOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(null, namespaces.rr + 'predicateObjectMap', predicateObjectMap)[0].subject;
  }

  _findPredicateObjectMapOfObjectMap(objectMap) {
    return this.mappingStore.getTriples(null, namespaces.rr + 'objectMap', objectMap)[0].subject;
  }

  _findPredicateObjectMapOfPredicateMap(predicateMap) {
    return this.mappingStore.getTriples(null, namespaces.rr + 'predicateMap', predicateMap)[0].subject;
  }

  _findObjectMapOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(predicateObjectMap, namespaces.rr + 'objectMap', null)[0].object;
  }

  _findPredicateMapOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(predicateObjectMap, namespaces.rr + 'predicateMap', null)[0].object;
  }
}

module.exports = Analyzer;