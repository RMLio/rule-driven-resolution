/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();
const winston = require('winston');
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
      let violation = {
        possibleChanges: []
      };

      switch (r.object) {
        case namespaces.ns1 + 'codeDatatype':
          violation.rdfunitCode = 'RDFS-RANGED';
          break;
        case namespaces.ns1 + 'codeDomain':
          violation.rdfunitCode = 'RDFS-DOMAIN';
          break;
        case namespaces.ns1 + 'codeDisjoint':
          violation.rdfunitCode = 'OWLDISJC';
          break;
        case namespaces.ns1 + 'codeRange':
          violation.rdfunitCode = 'RDFS-RANGE';
          break;
        case namespaces.ns1 + 'duplicateLanguageCode':
          violation.rdfunitCode = 'ONELANG';
          break;
        case namespaces.ns1 + 'disjointPredicate':
          violation.rdfunitCode = 'OWLDISJP';
          break;
        case namespaces.ns1 + 'asymmetricPredicate':
          violation.rdfunitCode = 'OWL-ASYMP';
          break;
      }

      if (violation.rdfunitCode) {
        resources.forEach(resource => {
          let subjectsOfChange = this.validationStore.getTriples(resource, namespaces.rdf + 'subject').map(a => a.object);

          if (subjectsOfChange.length > 0) {
            subjectsOfChange.forEach(subjectOfChange => {
              console.log(subjectOfChange);
              let termMapType = this.mappingStore.getTriples(subjectOfChange, namespaces.rdf + 'type').map(a => a.object)[0];

              let change = {
                termMapType,
                termMap: subjectOfChange
              };

              switch (r.object) {
                case namespaces.ns1 + 'codeDatatype':
                  this._processRDFS_RANGED(change);
                  break;
                case namespaces.ns1 + 'codeDomain':
                  this._processRDFS_DOMAIN(change);
                  break;
                case namespaces.ns1 + 'codeDisjoint':
                  Analyzer._processOWLDISJC(change);
                  break;
                case namespaces.ns1 + 'codeRange':
                  this._processRDFS_RANGE(change);
                  break;
                case namespaces.ns1 + 'duplicateLanguageCode':
                  this._processONELANG(change);
                  break;
                case namespaces.ns1 + 'disjointPredicate':
                  this._processOWLDISJP(change);
                  break;
                case namespaces.ns1 + 'asymmetricPredicate':
                  this._processOWL_ASYMP(change);
                  break;
              }

              if (change.element) {
                let i = 0;

                while (i < violation.possibleChanges.length
                  && !(violation.possibleChanges[i].termMapType === change.termMapType
                  && violation.possibleChanges[i].termMap === change.termMap
                  && violation.possibleChanges[i].element === change.element)) {
                  i ++;
                }

                if (i === violation.possibleChanges.length) {
                  violation.possibleChanges.push(change);
                }
              }
            });
          } else {
            winston.error(`The resource ${resource} does not have an rdf:type.`);
          }
        });

        this.violations.push(violation);
      }
    });

    console.log(JSON.stringify(this.violations));
  }

  getEffectsOfSingleChange(termMap, element) {
    let termMapType = this.mappingStore.getTriples(termMap, namespaces.rdf + 'type')[0].object;

    if (termMapType === namespaces.rr + 'ObjectMap') {
      if (element === namespaces.rr + 'datatype') {
        return this._getEffectOfChangingDatatypeOfObjectMap(termMap);
      }
    } else if (termMapType === namespaces.rr + 'PredicateMap') {
      if (element === namespaces.rr + 'predicate') {
        return this._getEffectOfChangingPredicateOfPredicateMap(termMap);
      }
    }
  }

  _processRDFS_RANGED(change) {
    switch (change.termMapType) {
      case namespaces.rr + 'ObjectMap':
        change.element = namespaces.rr + 'datatype';
        break;
      case namespaces.rr + 'PredicateMap':
        change.element = this._findValuePropertyOfTermMap(change.termMap);
        break;
    }
  }

  _processRDFS_RANGE(change) {
    this._processRDFS_DOMAIN(change);
  }

  _processRDFS_DOMAIN(change) {
    switch (change.termMapType) {
      case namespaces.rr + 'SubjectMap':
        change.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        change.element = this._findValuePropertyOfTermMap(change.termMap);
        break;

      case namespaces.rr + 'PredicateObjectMap':
        let pm = this._findPredicateMapOfPredicateObjectMap(change.termMap);
        let predicate = this._findPredicateOfPredicateMap(pm);

        if (predicate === namespaces.rdf + 'type') {
          let om = this._findObjectMapOfPredicateObjectMap(change.termMap);
          change.termMap = om;
          change.termMapType = namespaces.rr + 'ObjectMap';
        } else {
          change.termMap = pm;
          change.termMapType = namespaces.rr + 'PredicateMap';
        }

        this._processRDFS_DOMAIN(change);
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        change.element = this._findValuePropertyOfTermMap(change.termMap);
        break;
    }
  }

  static _processOWLDISJC(change) {
    switch (change.termMapType) {
      case namespaces.rr + 'SubjectMap':
        change.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        if (this.mappingStore.getTriples(change.termMap, namespaces.rr + 'constant').length > 0) {
          change.element = namespaces.rr + 'constant';
        } else if (this.mappingStore.getTriples(change.termMap, namespaces.rr + 'template').length > 0) {
          change.element = namespaces.rr + 'template';
        } else {
          change.element = namespaces.rml + 'reference';
        }
        break;
    }
  }

  static _processONELANG(change) {
    if (change.termMapType === namespaces.rr + "ObjectMap") {
      change.element = namespaces.rr + 'language';
    }
  }

  static _processOWLDISJP(change) {
    if (change.termMapType === namespaces.rr + "PredicateObjectMap") {
      change.element = namespaces.rr + 'predicate';
    }
  }

  static _processOWL_ASYMP(change) {
    Analyzer._processOWLDISJP(change);
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

  _findPredicateOfPredicateMap(predicateMap) {
    return this.mappingStore.getTriples(predicateMap, this._findValuePropertyOfTermMap(predicateMap), null).map(a => a.object);
  }

  _findValuePropertyOfTermMap(termMap) {
    if (this.mappingStore.getTriples(termMap, namespaces.rr + 'constant').length > 0) {
      return namespaces.rr + 'constant';
    } else if (this.mappingStore.getTriples(termMap, namespaces.rr + 'template').length > 0) {
      return namespaces.rr + 'template';
    } else {
      return namespaces.rml + 'reference';
    }
  }
}

module.exports = Analyzer;