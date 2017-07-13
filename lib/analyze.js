/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();
namespaces.rlog = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#';
namespaces.rut = 'http://rdfunit.aksw.org/ns/core#';
namespaces.cs = 'http://vocab.org/changeset/schema#';
namespaces.ns1 = 'http://www.ournicecode.org#';

class Analyzer {

  constructor(validationStore, mappingStore){
    this.validationStore = validationStore;
    this.mappingStore = mappingStore;
  }

  analyze() {
    let result = this.validationStore.getTriples(null, namespaces.rlog + 'hasCode', namespaces.ns1 + 'codeDatatype');

    result.forEach(r => {
      switch (r.object) {
        case namespaces.ns1 + 'codeDatatype':
          this.processRDFS_RANGD(r.subject);
          break;
      }
    });
  }

  processRDFS_RANGD(logEntry) {
    let resources = this.validationStore.getTriples(logEntry, namespaces.rlog + 'resource').map(a => a.object);

    resources.forEach(resource => {
      let subjectOfChange = this.validationStore.getTriples(resource, namespaces.rdf + 'subject')[0].object;
      let termMapType = this.mappingStore.getTriples(subjectOfChange, namespaces.rdf + 'type').map(a => a.object)[0];

      console.log(subjectOfChange);
      console.log(termMapType);
    });
  }
}

module.exports = function(validationStore, mappingStore) {
  let a = new Analyzer(validationStore, mappingStore);
  a.analyze();
};