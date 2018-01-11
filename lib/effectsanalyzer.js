/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Analyzer   = require('./analyzer.js');
const namespaces = require('prefix-ns').asMap();
const winston    = require('winston');

class EffectsAnalyzer extends Analyzer {

  constructor(store) {
    super(store);
  }

  getEffects(termMap, element) {
    let effects = [];
    const termMapTypes = this.mappingStore.getTriples(termMap, namespaces.rdf + 'type').map(a => a.object);
    let termMapType = termMapTypes[0];

    if (termMapType === namespaces.rr + 'TermMap') {
      termMapType = termMapTypes[1];
    }

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

      case namespaces.rr + 'RefObjectMap':
        effects = this._getEffectsOfChangeToRefObjectMap(termMap, element);
        break;

      case namespaces.rr + 'TriplesMap':
        effects = this._getEffectsOfChangeToTriplesMap(termMap, element);
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

    //check if OMs refers to parentTriplesMap
    const oms = this._findObjectMapsOfPredicateMap(pm);

    oms.forEach(om => {
      const parentTriplesMaps = this.mappingStore.getTriples(om, namespaces.rr + 'parentTriplesMap').map(a => a.object);

      if (parentTriplesMaps.length > 0) {
        const typeOMs = this._findObjectMapsofTriplesMapWithPredicate(parentTriplesMaps[0], namespaces.rdf + 'type');

        effects = effects.concat(typeOMs);

        if (typeOMs.length === 0) {
          effects.push(parentTriplesMaps[0]);
        }
      }
    });

    const tms = this._findTriplesMapsOfPredicateMap(pm);

    tms.forEach(tm => {
      const otherPMs = this._findPredicateMapsOfTriplesMap(tm);

      effects = effects.concat(otherPMs);
    });

    if (effects.indexOf(pm) !== -1) {
      effects.splice(effects.indexOf(pm), 1);
    }

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

          //check if OMs refers to parentTriplesMap
          const oms = this._findObjectMapsOfTriplesMap(tm);

          oms.forEach(om => {
            const parentTriplesMaps = this.mappingStore.getTriples(om, namespaces.rr + 'parentTriplesMap').map(a => a.object);

            if (parentTriplesMaps.length > 0) {
              const typeOMs = this._findObjectMapsofTriplesMapWithPredicate(parentTriplesMaps[0], namespaces.rdf + 'type');

              effects = effects.concat(typeOMs);

              if (typeOMs.length === 0) {
                effects.push(parentTriplesMaps[0]);
              }
            }
          });
        });

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToRefObjectMap(rom, element) {
    let effects = [];

    switch (element) {
      case namespaces.rr + 'parentTriplesMap':
        const pms = this._findPredicateMapsOfObjectMap(rom);
        effects = effects.concat(pms);

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }

  _getEffectsOfChangeToTriplesMap(tm, element) {
    let effects = [];

    switch (element) {
      case namespaces.rdf + 'type':
        const pms = this._findPredicateMapsOfTriplesMap(tm);
        effects = effects.concat(pms);

        break;
      case namespaces.rdf + 'predicate':
        const oms = this._findObjectMapsofTriplesMapWithPredicate(namespaces.rdf + 'type');
        effects = effects.concat(oms);

        break;
      default:
        winston.error(`The element ${element} is not supported.`);
    }

    return effects;
  }
}

module.exports = EffectsAnalyzer;