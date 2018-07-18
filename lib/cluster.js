/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Analyzer = require('./analyzer.js');
const namespaces = require('prefix-ns').asMap();
namespaces.fnml = 'http://semweb.mmlab.be/ns/fnml#';

class Clusterer extends Analyzer {

  constructor(rmlStore) {
    super(rmlStore);
  }

  getClusters(rules) {
    const clusters = {};

    for (let i = 0; i < rules.length; i ++) {
      const rule = rules[i];
      const tms = this._getTriplesMaps(rule);

      tms.forEach(tm => {
        if (!clusters[tm]) {
          clusters[tm] = [];
        }

        clusters[tm].push(rule);
      });
    }

    const result = [];
    const tms = Object.keys(clusters);

    for (let i = 0; i < tms.length; i ++) {
      result.push({tm: tms[i], rules: clusters[tms[i]]});
    }

    return result;
  }

  _getTriplesMaps(rule) {
    const termMapTypes = this.mappingStore.getTriples(rule, namespaces.rdf + 'type').map(a => a.object);
    let termMapType = termMapTypes[0];

    if (termMapType === namespaces.rr + 'TermMap') {
      termMapType = termMapTypes[1];
    }

    switch(termMapType) {
      case namespaces.rr + 'ObjectMap':
      case namespaces.rr + 'RefObjectMap':
      case namespaces.fnml + 'FunctionTermMap':
        return this._findTriplesMapsOfObjectMap(rule);
      case namespaces.rr + 'PredicateMap':
        return this._findTriplesMapsOfPredicateMap(rule);
      case namespaces.rr + 'SubjectMap':
        return this._findTriplesMapsOfSubjectMap(rule);
      case namespaces.rr + 'PredicateObjectMap':
        return this._findTriplesMapsOfPredicateObjectMap(rule);
      case namespaces.rr + 'TriplesMap':
        return [rule];
      default:
        console.warn(`Can find TriplesMaps for ${rule} (TermMapType = ${termMapType}`);
        return [];
    }
  }
}

module.exports = Clusterer;