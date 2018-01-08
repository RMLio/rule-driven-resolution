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

    unwantedTriples = unwantedTriples.concact(this.mappingTriples.getTriples(null, namespaces.rr + 'predicateMap'));
    unwantedTriples = unwantedTriples.concact(this.mappingTriples.getTriples(null, namespaces.rr + 'objectMap'));
    unwantedTriples = unwantedTriples.concact(this.mappingTriples.getTriples(null, namespaces.rr + 'subjectMap'));

    for (const triple in this.mappingTriples.getTriples()) {
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
    return this.w1 * this._getInconsistencyScore(termmap) + this.w2 * this._getPossibleAffectedRulesScore(termmap);
  }

  _getInconsistencyScore(termmap) {
    let counter = 0;

    for (const inconsistency in this.inconsistencies) {
      if (inconsistency.rules.indexOf(termmap) !== -1) {
        counter ++;
      }
    }

    return counter/this.inconsistencies.length;
  }

  _getPossibleAffectedRulesScore(termmap) {
    const totalRules = this.mappingTriples.getTriples().length;

    return this.effects[termmap].length/totalRules;
  }
}