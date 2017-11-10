/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();

class Analyzer {

  constructor(store) {
    this.mappingStore = store;
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

  _findPredicateMapsOfPredicateObjectMap(pom) {
    return this.mappingStore.getTriples(pom, namespaces.rr + 'predicateMap', null).map(a => a.object);
  }

  _findPredicateObjectMapsOfObjectMap(objectMap) {
    return this.mappingStore.getTriples(null, namespaces.rr + 'objectMap', objectMap).map(a => a.subject);
  }

  _findPredicateObjectMapOfPredicateMap(predicateMap) {
    return this.mappingStore.getTriples(null, namespaces.rr + 'predicateMap', predicateMap)[0].subject;
  }

  _findObjectMapOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(predicateObjectMap, namespaces.rr + 'objectMap', null)[0].object;
  }

  _findObjectMapsOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(predicateObjectMap, namespaces.rr + 'objectMap', null).map(a => a.object);
  }

  _findPredicateMapOfPredicateObjectMap(predicateObjectMap) {
    return this.mappingStore.getTriples(predicateObjectMap, namespaces.rr + 'predicateMap', null)[0].object;
  }

  _findPredicateMapsOfTriplesMap(triplesMap) {
    let pms = [];
    const poms = this.mappingStore.getTriples(triplesMap, namespaces.rr + 'predicateObjectMap', null).map(a => a.object);

    poms.forEach(pom => {
      pms = pms.concat(this.mappingStore.getTriples(pom, namespaces.rr + 'predicateMap', null).map(a => a.object));
    });

    return pms;
  }

  _findPredicateOfPredicateMap(predicateMap) {
    return this.mappingStore.getTriples(predicateMap, this._findValuePropertyOfTermMap(predicateMap), null).map(a => a.object);
  }

  _findObjectMapsofTriplesMapWithPredicate(triplesMap, predicate) {
    let oms = [];
    const poms = this.mappingStore.getTriples(triplesMap, namespaces.rr + 'predicateObjectMap', null).map(a => a.object);

    poms.forEach(pom => {
      const pms = this.mappingStore.getTriples(pom, namespaces.rr + 'predicateMap', null).map(a => a.object);

      pms.forEach(pm => {
        const valueProperty = this._findValuePropertyOfTermMap(pm);

        if (this.mappingStore.getTriples(pm, valueProperty, null).map(a => a.object)[0] === predicate) {
          oms = oms.concat(this.mappingStore.getTriples(pom, namespaces.rr + 'objectMap', null).map(a => a.object));
        }
      });
    });

    return oms;
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