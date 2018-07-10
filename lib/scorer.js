/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();

class Scorer {

  constructor(mappingTriples, inconsistencies, effects) {
    this.mappingTriples = mappingTriples;
    this.inconsistencies = inconsistencies;
    this.effects = effects;

    this._calculateTripleCount();
  }

  _calculateTripleCount() {
    this.tripleCount = this.mappingTriples.size;

    this.tripleCount -= this.mappingTriples.getTriples(null, namespaces.rr + 'predicateMap').length;
    this.tripleCount -= this.mappingTriples.getTriples(null, namespaces.rr + 'objectMap').length;
    this.tripleCount -= this.mappingTriples.getTriples(null, namespaces.rr + 'subjectMap').length;
    this.tripleCount -= this.mappingTriples.getTriples(null, namespaces.rdf + 'type').length;
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
    //return (counter + 1) / (this.inconsistencies.length + 1);
  }

  _getPossibleAffectedRulesScore(termmap) {
    const totalRules = this.tripleCount;

    return Math.log(this.effects[termmap].length + 1) /  Math.log(totalRules);
    //return (this.effects[termmap].length + 1) /  totalRules;
  }
}

module.exports = Scorer;