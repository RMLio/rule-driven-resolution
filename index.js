/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const fs = require('fs');
const validate = require('./lib/validate.js');
const analyze = require('./lib/analyze.js');
const N3 = require('n3');

let mappingsFolder = process.argv[2];

console.log(mappingsFolder);

let mapping = `@prefix rr: <http://www.w3.org/ns/r2rml#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rml: <http://semweb.mmlab.be/ns/rml#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ql: <http://semweb.mmlab.be/ns/ql#> .

@base <http://www.example.com/> .

<#Mapping> a rr:TriplesMap;
  rml:logicalSource [
    rml:source "data.csv";
    rml:referenceFormulation ql:CSV
  ];

  rr:subjectMap <#SubjectMap> ;
  rr:predicateObjectMap <#PredicateObjectMap> .

<#PredicateObjectMap> a rr:PredicateObjectMap;
  rr:predicateMap <#PredicateMap>;
  rr:objectMap <#ObjectMap1>.

<#PredicateMap> a rr:PredicateMap;
  rr:constant foaf:age.

<#ObjectMap1> a rr:ObjectMap;
  rml:reference "Age" ; rr:datatype xsd:float .

<#SubjectMap> a rr:SubjectMap;
  rr:template "http://example.com/{Name}_{Surname}".`;

validate(mapping).then((store) => {
  let parser = N3.Parser();
  let mappingStore = N3.Store();

  parser.parse(mapping, (err, triple) => {
    if (triple) {
      mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      analyze(store, mappingStore);
    }
  });
});