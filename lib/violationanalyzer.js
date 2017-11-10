/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Analyzer = require('./analyzer.js');
const namespaces = require('prefix-ns').asMap();
const winston = require('winston');
namespaces.rlog = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#';
namespaces.rut = 'http://rdfunit.aksw.org/ns/core#';
namespaces.cs = 'http://vocab.org/changeset/schema#';
namespaces.ns1 = 'http://www.ournicecode.org#';
winston.level = 'error';

class ViolationAnalyzer extends Analyzer {

  constructor(validationStore, mappingStore){
    super(mappingStore);
    this.validationStore = validationStore;
    this.violations = [];
  }

  analyze() {
    let result = this.validationStore.getTriples(null, namespaces.rlog + 'hasCode');

    result.forEach(r => {
      let resources = this.validationStore.getTriples(r.subject, namespaces.rlog + 'resource').map(a => a.object);
      let violation = {
        possibleActions: []
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
        case namespaces.ns1 + 'codeDisjointPredicate':
          violation.rdfunitCode = 'OWLDISJP';
          break;
        case namespaces.ns1 + 'asymmetricPredicate':
          violation.rdfunitCode = 'OWL-ASYMP';
          break;
        case namespaces.ns1 + 'irreflexivePredicate':
          violation.rdfunitCode = 'OWL-IRREFL';
          break;
        case namespaces.ns1 + 'typeDependency':
          violation.rdfunitCode = 'TYPEDEP';
          break;
        case namespaces.ns1 + 'typePropertyDependency':
          violation.rdfunitCode = 'TYPRO-DEP';
          break;
        case namespaces.ns1 + 'cardcode':
          violation.rdfunitCode = 'OWL-CARD';
          break;
      }

      if (violation.rdfunitCode) {
        resources.forEach(resource => {
          let subjectsOfChange = this.validationStore.getTriples(resource, namespaces.rdf + 'subject').map(a => a.object);

          if (subjectsOfChange.length > 0) {
            subjectsOfChange.forEach(subjectOfChange => {
              winston.debug(subjectOfChange);
              let termMapType = this.mappingStore.getTriples(subjectOfChange, namespaces.rdf + 'type').map(a => a.object)[0];

              let action = {
                termMapType,
                termMap: subjectOfChange
              };

              switch (r.object) {
                case namespaces.ns1 + 'codeDatatype':
                  this._processRDFS_RANGED(action);
                  break;
                case namespaces.ns1 + 'codeDomain':
                  this._processRDFS_DOMAIN(action);
                  break;
                case namespaces.ns1 + 'codeDisjoint':
                  this._processOWLDISJC(action);
                  break;
                case namespaces.ns1 + 'codeRange':
                  this._processRDFS_RANGE(action);
                  break;
                case namespaces.ns1 + 'duplicateLanguageCode':
                  ViolationAnalyzer._processONELANG(action);
                  break;
                case namespaces.ns1 + 'codeDisjointPredicate':
                  ViolationAnalyzer._processOWLDISJP(action);
                  break;
                case namespaces.ns1 + 'asymmetricPredicate':
                  ViolationAnalyzer._processOWL_ASYMP(action);
                  break;
                case namespaces.ns1 + 'irreflexivePredicate':
                  this._processOWL_IRREFL(action);
                  break;
                case namespaces.ns1 + 'typeDependency':
                  this._processTYPEDEP(action);
                  break;
                case namespaces.ns1 + 'typePropertyDependency':
                  this._processTYPRO_DEP(action);
                  break;
                case namespaces.ns1 + 'cardcode':
                  this._processOWL_CARD(action);
                  break;
                default:
                  winston.error(`${r.object} is not valid.`);
              }

              if (action.element) {
                let i = 0;

                while (i < violation.possibleActions.length
                  && !(violation.possibleActions[i].termMapType === action.termMapType
                  && violation.possibleActions[i].termMap === action.termMap
                  && violation.possibleActions[i].element === action.element)) {
                  i ++;
                }

                if (i === violation.possibleActions.length) {
                  violation.possibleActions.push(action);
                }
              }
            });
          } else {
            winston.warn(`The resource ${resource} does not have an rdf:subject.`);
          }
        });

        violation.possibleActions = ViolationAnalyzer._filterDuplicatePossibleActions(violation.possibleActions);
        this.violations.push(violation);
      }
    });

    //console.log(JSON.stringify(this.violations));
    return this.violations;
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

  _processRDFS_RANGED(action) {
    switch (action.termMapType) {
      case namespaces.rr + 'ObjectMap':
        action.element = namespaces.rr + 'datatype';
        break;
      case namespaces.rr + 'PredicateMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
    }

    action.type = 'change';
  }

  _processRDFS_RANGE(action) {
    //console.log(action);

    switch (action.termMapType) {
      case namespaces.rr + 'SubjectMap':
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;

      case namespaces.rr + 'PredicateObjectMap':
        let pm = this._findPredicateMapOfPredicateObjectMap(action.termMap);
        let predicate = this._findPredicateOfPredicateMap(pm);

        if (predicate === namespaces.rdf + 'type') {
          let om = this._findObjectMapOfPredicateObjectMap(action.termMap);
          action.termMap = om;
          action.termMapType = namespaces.rr + 'ObjectMap';
        } else {
          action.termMap = pm;
          action.termMapType = namespaces.rr + 'PredicateMap';
        }

        this._processRDFS_DOMAIN(action);
        break;

      case namespaces.rr + 'ObjectMap':
        const parentTriplesMaps = this.mappingStore.getTriples(action.termMap, namespaces.rr + 'parentTriplesMap', null);

        if (parentTriplesMaps.length === 0) {
          action.element = this._findValuePropertyOfTermMap(action.termMap);
        }

        break;
    }

    action.type = 'change';
  }

  _processRDFS_DOMAIN(action) {
    switch (action.termMapType) {
      case namespaces.rr + 'SubjectMap':
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;

      case namespaces.rr + 'PredicateObjectMap':
        let pm = this._findPredicateMapOfPredicateObjectMap(action.termMap);
        let predicate = this._findPredicateOfPredicateMap(pm);

        if (predicate === namespaces.rdf + 'type') {
          let om = this._findObjectMapOfPredicateObjectMap(action.termMap);
          action.termMap = om;
          action.termMapType = namespaces.rr + 'ObjectMap';
        } else {
          action.termMap = pm;
          action.termMapType = namespaces.rr + 'PredicateMap';
        }

        this._processRDFS_DOMAIN(action);
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
    }

    action.type = 'change';
  }

  _processOWLDISJC(action) {
    switch (action.termMapType) {
      case namespaces.rr + 'SubjectMap':
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        if (this.mappingStore.getTriples(action.termMap, namespaces.rr + 'constant').length > 0) {
          action.element = namespaces.rr + 'constant';
        } else if (this.mappingStore.getTriples(action.termMap, namespaces.rr + 'template').length > 0) {
          action.element = namespaces.rr + 'template';
        } else {
          action.element = namespaces.rml + 'reference';
        }
        break;
    }

    action.type = 'change';
  }

  static _processONELANG(action) {
    if (action.termMapType === namespaces.rr + "ObjectMap") {
      action.element = namespaces.rr + 'language';
    }
  }

  static _processOWLDISJP(action) {
    if (action.termMapType === namespaces.rr + "PredicateObjectMap") {
      action.element = namespaces.rr + 'predicate';
    }
  }

  _processOWL_IRREFL(action) {
    if (action.termMapType === namespaces.rr + "PredicateObjectMap") {
      const temps = this.mappingStore.getTriples(action.termMap, namespaces.rr + 'predicate', null).map(a => a.object);
      let predicate;

      if (temps.length > 0) {
        predicate = temps[0];

      } else {
        predicate = this._findPredicateOfPredicateMap(pm);
      }

      if (predicate === namespaces.rdf + 'type') {
        action.termMap = this._findObjectMapOfPredicateObjectMap(action.termMap);
        action.termMapType = namespaces.rr + 'ObjectMap';
        action.element = this._findValuePropertyOfTermMap(action.termMap);
      } else {
        action.element = namespaces.rr + 'predicate';
      }
    } else if (action.termMapType === namespaces.rr + "SubjectMap") {
      action.element = namespaces.rr + 'class';
    }
  }

  static _processOWL_ASYMP(action) {
    ViolationAnalyzer._processOWLDISJP(action);
  }

  _processTYPEDEP(action) {
    this._processOWLDISJC(action);

    if (action.termMapType === namespaces.rr + "TriplesMap") {
      action.element = namespaces.rr + 'predicateObjectMap';
    }
  }

  _processTYPRO_DEP(action) {
    this._processOWLDISJC(action);

    if (action.termMapType === namespaces.rr + "TriplesMap") {
      action.element = namespaces.rr + 'predicateObjectMap';
    }
  }

  _processOWL_CARD(action) {

    switch (action.termMapType) {
      case namespaces.rr + 'ObjectMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
      case namespaces.rr + 'PredicateObjectMap':
        let predicates = this.mappingStore.getTriples(action.termMap, namespaces.rr + 'predicate', null);

        if (predicates.length === 0) {
          action.termMapType = namespaces.rr + 'PredicateMap';
          action.termMap = this._findPredicateMapOfPredicateObjectMap(action.termMap);
          action.element = this._findValuePropertyOfTermMap(action.termMap);
        } else {
          action.element = namespaces.rr + 'predicate';
        }
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

  static _filterDuplicatePossibleActions(actions) {
    const uniqueActions = [];

    actions.forEach(action => {
      let i = 0;

      while (i < uniqueActions.length && ! (uniqueActions[i].termMapType === action.termMapType && uniqueActions[i].termMap === action.termMap && uniqueActions[i].element === action.element)) {
        i ++;
      }

      if (i === uniqueActions.length) {
        uniqueActions.push(action);
      }
    });

    return uniqueActions;
  }
}

module.exports = ViolationAnalyzer;