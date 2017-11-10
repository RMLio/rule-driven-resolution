/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const fs = require('fs');
const validate = require('./lib/validate.js');
const Analyzer = require('./lib/violationanalyzer.js');
const N3 = require('n3');
const namespaces = require('prefix-ns').asMap();

let input = process.argv[2];

let mapping = fs.readFileSync(input, 'utf-8');

validate(mapping).then((store) => {
  let parser = N3.Parser();
  let mappingStore = N3.Store();

  parser.parse(mapping, (err, triple) => {
    if (triple) {
      mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      let analyzer = new Analyzer(store, mappingStore);
      analyzer.analyze();
      //console.log(analyzer.getEffects('http://www.example.com/#ObjectMap1', namespaces.rr + 'datatype'));
    }
  });
});