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
    let effects;
    const termMapType = this.mappingStore.getTriples(termMap, namespaces.rdf + 'type')[0].object;

    switch (termMapType) {
      case namespaces.rr + 'PredicateObjectMap':
        effects = this._getEffectsOfChangeToPredicateObjectMap(termMap, element);
        break;

      case namespaces.rr + 'SubjectMap':
        effects = this._getEffectsOfChangeToSubjectMap(termMap, element);
        break;

      case namespaces.rr + 'PredicateMap':
        effects = this._getEffectsOfChangeToPredicateMap(termMap, element);
        break;

      case namespaces.rr + 'ObjectMap':
        effects = this._getEffectsOfChangeToObjectMap(termMap, element);
        break;

      default:
        winston.error(`The Term Map with the type ${termMapType} is not supported.`);
    }

    return effects.filter((item, index) => {
      return effects.indexOf(item) === index;
    });
  }

  _getEffectsOfChangeToPredicateObjectMap(pom, element) {
    let effects = [];

    switch (element) {
      case namespaces.rr + 'predicate':
        //1. get term maps that defines the class
        //1.1 get subjectmaps and check for rr:class
        const tms = this._findTriplesMapsOfPredicateObjectMap(pom);

        tms.forEach(tm => {
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
        });
        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToObjectMap(om, element) {
    let effects = [];
    const dataElements = [
      namespaces.rml + 'reference',
      namespaces.rr + 'template',
      namespaces.rr + 'constant'
    ];
    const supportedElements = [
      namespaces.rr + 'termType',
      namespaces.rr + 'datatype',
      namespaces.rr + 'language',
    ].concat(dataElements);


    if (supportedElements.indexOf(element) !== -1) {
      const poms = this._findPredicateObjectMapsOfObjectMap(om);

      poms.forEach(pom => {
        effects = effects.concat(this._findPredicateMapsOfPredicateObjectMap(pom));
      });

      if (dataElements.indexOf(element) !== -1) {
        const pms = this._findPredicateMapsOfObjectMap(om);

        pms.forEach(pm => {
          const constants = this.mappingStore.getTriples(pm, namespaces.rr + 'constant', null).map(a => a.object);

          if (constants.length > 0 && constants[0] === namespaces.rdf + 'type') {
            const poms = this._findPredicateObjectMapsOfObjectMap(om);

            poms.forEach(pom => {
              const tms = this._findTriplesMapsOfPredicateObjectMap(pom);

              tms.forEach(tm => {
                //get subject maps and check if has rr:class
                const sm = this._findSubjectMapOfTriplesMap(tm);
                const classes = this.mappingStore.getTriples(sm, namespaces.rr + 'class', null);

                if (classes.length > 0) {
                  effects.push(sm);
                }

                //get all oms with pm with rdf:type
                effects = effects.concat(this._findObjectMapsofTriplesMapWithPredicate(tm, namespaces.rdf + 'type'));
                //get all pms without rdf:type
                effects = effects.concat(this._findPredicateMapsOfTriplesMap(tm));
              });
            });
          }
        });
      }
    } else {
      winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToPredicateMap(pm, element) {
    let effects = [];
    const poms = this._findPredicateObjectMapsOfPredicateMap(pm);

    poms.forEach(pom => {
      const tms = this._findTriplesMapsOfPredicateObjectMap(pom);

      tms.forEach(tm => {
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
      });
    });

    return effects;
  }

  _getEffectsOfChangeToSubjectMap(sm, element) {
    let effects = [];

    switch (element) {
      case namespaces.rr + 'class':
        const tms = this._findTriplesMapsOfSubjectMap(sm);

        tms.forEach(tm => {
          const pms = this._findPredicateMapsOfTriplesMap(tm);
          effects = effects.concat(pms);

          //get all oms with pm with rdf:type
          effects = effects.concat(this._findObjectMapsofTriplesMapWithPredicate(tm, namespaces.rdf + 'type'));
        });

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }
}

module.exports = EffectsAnalyzer;