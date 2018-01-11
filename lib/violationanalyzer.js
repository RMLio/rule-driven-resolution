/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Analyzer = require('./analyzer.js');
const namespaces = require('prefix-ns').asMap();
const winston = require('winston');
const codes = require('./codes.json');
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

  analyze(addInconsistency = false) {
    let result = this.validationStore.getTriples(null, namespaces.rlog + 'hasCode');

    result.forEach(r => {
      let resources = this.validationStore.getTriples(r.subject, namespaces.rlog + 'resource').map(a => a.object);
      let violation = {
        possibleActions: []
      };

      if (addInconsistency) {
        violation.inconsistency = r.subject;
      }

      const code = r.object.replace(namespaces.ns1, '');

      violation.rdfunitCode = codes[code];

      if (violation.rdfunitCode) {
        resources.forEach(resource => {
          let subjectsOfChange = this.validationStore.getTriples(resource, namespaces.rdf + 'subject').map(a => a.object);

          if (subjectsOfChange.length > 0) {
            subjectsOfChange.forEach(subjectOfChange => {
              winston.debug(subjectOfChange);
              let termMapTypes = this.mappingStore.getTriples(subjectOfChange, namespaces.rdf + 'type').map(a => a.object);
              let termMapType = termMapTypes[0];

              if (termMapType === namespaces.rr + 'TermMap') {
                termMapType = termMapTypes[1];
              }

              let action = {
                termMapType,
                termMap: subjectOfChange
              };

              switch (r.object) {
                case namespaces.ns1 + 'codeDatatype':
                  action = this._processRDFS_RANGED(action);
                  break;
                case namespaces.ns1 + 'codeDomain':
                  action = this._processRDFS_DOMAIN(action);
                  break;
                case namespaces.ns1 + 'codeDisjoint':
                  action = this._processOWLDISJC(action);
                  break;
                case namespaces.ns1 + 'codeRange':
                  action = this._processRDFS_RANGE(action);
                  break;
                case namespaces.ns1 + 'duplicateLanguageCode':
                  action = ViolationAnalyzer._processONELANG(action);
                  break;
                case namespaces.ns1 + 'codeDisjointPredicate':
                  action = this._processOWLDISJP(action);
                  break;
                case namespaces.ns1 + 'asymmetricPredicate':
                  action = this._processOWL_ASYMP(action);
                  break;
                case namespaces.ns1 + 'irreflexivePredicate':
                  action = this._processOWL_IRREFL(action);
                  break;
                case namespaces.ns1 + 'typeDependency':
                  action = this._processTYPEDEP(action);
                  break;
                case namespaces.ns1 + 'typePropertyDependency':
                  action = this._processTYPRO_DEP(action);
                  break;
                case namespaces.ns1 + 'cardcode':
                  action = this._processOWL_CARD(action);
                  break;
                default:
                  winston.error(`${r.object} is not valid.`);
              }

              let actions = action;

              if (!Array.isArray(actions)) {
                actions = [actions];
              }

              actions.forEach(action => {
                if (action.element) {
                  let i = 0;

                  while (i < violation.possibleActions.length
                  && !(violation.possibleActions[i].termMapType === action.termMapType
                    && violation.possibleActions[i].termMap === action.termMap
                    && violation.possibleActions[i].element === action.element
                    && violation.possibleActions[i].inconsistency === action.inconsistency)) {
                    i ++;
                  }

                  if (i === violation.possibleActions.length) {
                    violation.possibleActions.push(action);
                  }
                }
              });
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

    return action;
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
        const pms = this._findPredicateMapsOfPredicateObjectMap(action.termMap);
        const temps = [];

        pms.forEach(pm => {
          let predicate = this._findPredicateOfPredicateMap(pm);

          if (predicate === namespaces.rdf + 'type') {
            const oms = this._findObjectMapsOfPredicateObjectMap(action.termMap);

            oms.forEach(om => {
              action.termMap = om;
              action.termMapType = namespaces.rr + 'ObjectMap';

              temps.push(this._processRDFS_DOMAIN(action));
            });
          } else {
            action.termMap = pm;
            action.termMapType = namespaces.rr + 'PredicateMap';
            temps.push(this._processRDFS_DOMAIN(action));
          }
        });

        action = temps;
        break;

      case namespaces.rr + 'ObjectMap':
        const parentTriplesMaps = this.mappingStore.getTriples(action.termMap, namespaces.rr + 'parentTriplesMap', null);

        if (parentTriplesMaps.length === 0) {
          action.element = this._findValuePropertyOfTermMap(action.termMap);
        }

        break;
    }

    action.type = 'change';

    return action;
  }

  _processRDFS_DOMAIN(action) {
    switch (action.termMapType) {
      case namespaces.rr + 'SubjectMap':
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
    }

    action.type = 'change';

    return action;
  }

  _processOWLDISJC(action) {
    switch (action.termMapType) {
      case namespaces.rr + 'SubjectMap':
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'ObjectMap':
        //we are dealing with a POM that has predicate rdf:type
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
    }

    action.type = 'change';

    return action;
  }

  static _processONELANG(action) {
    if (action.termMapType === namespaces.rr + "ObjectMap") {
      action.element = namespaces.rr + 'language';
    }

    return action;
  }

  _processOWLDISJP(action) {

    if (action.termMapType === namespaces.rr + "PredicateObjectMap") {
      if (this.mappingStore.getTriples(action.termMap, namespaces.rr + 'predicate').length > 0) {
        action.element = namespaces.rr + 'predicate';
      }
    } else if (action.termMapType === namespaces.rr + "PredicateMap") {
      action.element = this._findValuePropertyOfTermMap(action.termMap);
    }

    return action;
  }

  _processOWL_IRREFL(action) {
    switch (action.termMapType) {
      case namespaces.rr + "SubjectMap":
        action.element = namespaces.rr + 'class';
        break;

      case namespaces.rr + 'PredicateMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
    }

    return action;
  }

  _processOWL_ASYMP(action) {
    return this._processOWLDISJP(action);
  }

  _processTYPEDEP(action) {
    action = this._processOWLDISJC(action);

    if (action.termMapType === namespaces.rr + "TriplesMap") {
      action.element = namespaces.rdf + 'type';
    }

    return action;
  }

  _processTYPRO_DEP(action) {
    action = this._processOWLDISJC(action);

    if (action.termMapType === namespaces.rr + "TriplesMap") {
      action.element = namespaces.rdf + 'predicate';
    }

    return action;
  }

  _processOWL_CARD(action) {

    //console.log(action);

    switch (action.termMapType) {
      case namespaces.rr + 'ObjectMap':
        action.element = this._findValuePropertyOfTermMap(action.termMap);
        break;
      case namespaces.rr + 'PredicateObjectMap':
        let predicates = this.mappingStore.getTriples(action.termMap, namespaces.rr + 'predicate', null);

        if (predicates.length === 0) {
          let temp = [];

          const pms = this._findPredicateMapsOfPredicateObjectMap(action.termMap);

          pms.forEach(pm => {
            temp.push({
              termMapType: namespaces.rr + 'PredicateMap',
              termMap: pm,
              element: this._findValuePropertyOfTermMap(pm)
            });

            if (! this._findValuePropertyOfTermMap(pm)) {
              console.log('SHOULD NOT HAPPEN!!!!');
            }
          });

          if (temp.length === 1) {
            action = temp[0];
          } else {
            action = temp;
          }

          //console.log(action);
        } else {
          action.element = namespaces.rr + 'predicate';
        }
    }

    return action;
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