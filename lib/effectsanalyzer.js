/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Analyzer = require('./analyzer.js');
const namespaces = require('prefix-ns').asMap();
const winston = require('winston');

class EffectsAnalyzer extends Analyzer {

  constructor(store) {
    super(store);
  }

  getEffects(termMap, element) {
    const termMapType = this.mappingStore.getTriples(termMap, namespaces.rdf + 'type')[0].object;

    switch (termMapType) {
      case namespaces.rr + 'PredicateObjectMap':
        return this._getEffectsOfChangeToPredicateObjectMap(termMap, element);
        break;

      case namespaces.rr + 'SubjectMap':
        return this._getEffectsOfChangeToSubjectMap(termMap, element);
        break;

      case namespaces.rr + 'PredicateMap':
        return this._getEffectsOfChangeToPredicateMap(termMap, element);
        break;

      case namespaces.rr + 'ObjectMap':
        return this._getEffectsOfChangeToObjectMap(termMap, element);
        break;

      default:
        winston.error(`The Term Map with the type ${termMapType} is not supported.`);
    }
  }

  _getEffectsOfChangeToPredicateObjectMap(pom, element) {
    let effects = [];

    switch (element) {
      case namespaces.rr + 'predicate':
        //1. get term maps that defines the class
        //1.1 get subjectmap and check for rr:class
        const tm = this._findTriplesMapOfPredicateObjectMap(pom);
        const sm = this._findSubjectMapOfTriplesMap(tm);

        const classes = this.mappingStore.getTriples(sm, namespaces.rr + 'class', null);

        if (classes.length > 0) {
          effects.push(sm);
        }

        //1.2 get objectmaps
        effects = effects.concat(this._findObjectMapsofTriplesMapWithPredicate(tm, namespaces.rdf + 'type'));

        //2. get term maps that defines object
        const oms = this._findObjectMapsOfPredicateObjectMap(pom);

        effects = effects.concat(oms);
        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToObjectMap(om, element) {
    let effects = [];

    switch(element) {
      case namespaces.rr + 'termType':
      case namespaces.rr + 'datatype':
      case namespaces.rr + 'language':
      case namespaces.rml + 'reference':
      case namespaces.rr + 'template':
      case namespaces.rr + 'constant':
        const poms = this._findPredicateObjectMapsOfObjectMap(om);

        poms.forEach(pom => {
          effects = effects.concat(this._findPredicateMapsOfPredicateObjectMap(pom));
        });

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToPredicateMap(pm, element) {
    let effects = [];

    //1. get term maps that defines the class
    //1.1 get subjectmap and check for rr:class
    const pom = this._findPredicateObjectMapOfPredicateMap(pm);
    const tm = this._findTriplesMapOfPredicateObjectMap(pom);
    const sm = this._findSubjectMapOfTriplesMap(tm);

    const classes = this.mappingStore.getTriples(sm, namespaces.rr + 'class', null);

    if (classes.length > 0) {
      effects.push(sm);
    }

    //1.2 get objectmaps
    effects = effects.concat(this._findObjectMapsofTriplesMapWithPredicate(tm, namespaces.rdf + 'type'));

    //2. get term maps that defines object
    const oms = this._findObjectMapsOfPredicateObjectMap(pom);

    effects = effects.concat(oms);

    return effects;
  }

  _getEffectsOfChangeToSubjectMap(sm, element) {
    let effects = [];

    switch (element) {
      case namespaces.rr + 'class':
        const tm = this.mappingStore.getTriples(null, namespaces.rr + 'subjectMap', sm)[0].subject;
        const pms = this._findPredicateMapsOfTriplesMap(tm);
        effects = effects.concat(pms);

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }
}

module.exports = EffectsAnalyzer;