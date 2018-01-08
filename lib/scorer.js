/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const N3         = require('n3');
const namespaces = require('prefix-ns').asMap();

class Scorer {

  constructor(mappingTriples, inconsistencies, effects, w1, w2) {
    this.mappingTriples = mappingTriples;
    this.inconsistencies = inconsistencies;
    this.effects = effects;

    if (w1 === undefined && w2 === undefined) {
      this.w1 = 0.5;
      this.w2 = 0.5;
    } else if (w1 !== undefined && w2 !== undefined) {
      this.w1 = w1;
      this.w2 = w2;
    } else {
      throw new Error('w1 and w2 should be either both defined or undefined.');
    }

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
    //console.log(`${this.w1} * ${this._getInconsistencyScore(termmap)} + ${this.w2} * ${this._getPossibleAffectedRulesScore(termmap)}`);
    //return this.w1 * this._getInconsistencyScore(termmap) + this.w2 * this._getPossibleAffectedRulesScore(termmap);

    return (2 * this._getInconsistencyScore(termmap) * this._getPossibleAffectedRulesScore(termmap)) / (this._getInconsistencyScore(termmap) + this._getPossibleAffectedRulesScore(termmap));
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