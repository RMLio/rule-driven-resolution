/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const N3         = require('n3');
const namespaces = require('prefix-ns').asMap();

class Scorer {

  constructor(mappingTriples, inconsistencies, effects) {
    this.mappingTriples = mappingTriples;
    this.inconsistencies = inconsistencies;
    this.effects = effects;

    this._removeUnwantedTriples();
  }

  _removeUnwantedTriples() {
    const triples = new N3.Store();
    let unwantedTriples = [];

    unwantedTriples = unwantedTriples.concat(this.mappingTriples.getTriples(null, namespaces.rr + 'predicateMap'));
    unwantedTriples = unwantedTriples.concat(this.mappingTriples.getTriples(null, namespaces.rr + 'objectMap'));
    unwantedTriples = unwantedTriples.concat(this.mappingTriples.getTriples(null, namespaces.rr + 'subjectMap'));
    unwantedTriples = unwantedTriples.concat(this.mappingTriples.getTriples(null, namespaces.rdf + 'type'));

    for (let j = 0; j < this.mappingTriples.getTriples().length; j ++) {
      const triple = this.mappingTriples.getTriples()[j];
      let i = 0;

      while (i < unwantedTriples.length && !(unwantedTriples[i].subject === triple.subject && unwantedTriples[i].object === triple.object && unwantedTriples[i].predicate === triple.predicate)) {
        i ++;
      }

      if (i === unwantedTriples.length) {
        triples.addTriple(triple.subject, triple.predicate, triple.object);
      }
    }

    this.mappingTriples = triples;
  }

  getScore(termmap) {
    const i = this._getInconsistencyScore(termmap);
    const j = this._getPossibleAffectedRulesScore(termmap);

    return {
      inconsistencyScore: i,
      possibleAffectedRulesScore: j,
      harmonic: (2 * i * j) / (i + j),
      arithmetic: (i + j)/2,
      geometric: Math.sqrt(i * j)
    }
  }

  _getInconsistencyScore(termmap) {
    let counter = 0;

    for (let i = 0; i < this.inconsistencies.length; i ++) {
      const inconsistency = this.inconsistencies[i];

      if (inconsistency.rules.indexOf(termmap) !== -1) {
        counter ++;
      }
    }

    return Math.log(counter + 1) / Math.log(this.inconsistencies.length + 1);
  }

  _getPossibleAffectedRulesScore(termmap) {
    const totalRules = this.mappingTriples.getTriples().length;

    return Math.log(this.effects[termmap].length + 1) /  Math.log(totalRules);
  }
}

module.exports = Scorer;