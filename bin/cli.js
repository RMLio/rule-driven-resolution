#!/usr/bin/env node
/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const program = require('commander');
const fs = require('fs');
const path = require('path');
const pkginfo = require('pkginfo');
const normalizeRML = require('normalize-rml').normalizeRml;
const validate = require('../lib/validate');
const ViolationAnalyzer = require('../lib/violationanalyzer.js');
const EffectsAnalyzer = require('../lib/effectsanalyzer.js');
const N3 = require('n3');
const Scorer = require('../lib/scorer.js');

pkginfo(module, 'version');

program.version(module.exports.version);
program.option('-i, --input <input>', 'input mapping file');
program.option('-n, --inconsistencies <inconsistencies>', 'inconsistencies file');
program.option('-o, --output <output>', 'output file (default: stdout)');
program.option('-e, --effects', 'TODO');
program.parse(process.argv);

const mappingStore = N3.Store();

if (!program.input) {
  console.error('Please provide an input file.');
} else {
  if (!path.isAbsolute(program.input)) {
    program.input = path.join(process.cwd(), program.input);
  }

  //const mapping = fs.readFileSync(program.input, 'utf-8');
  const stream = fs.createReadStream(program.input, {encoding: 'utf8'});
  const parser = N3.Parser();

  parser.parse(stream, (err, triple) => {
    if (triple) {
      mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
    } else {
      console.log('all mapping triples in their store');
      normalizeRML(mappingStore, () => {

        if (program.inconsistencies) {
          const inconsistenciesStream = fs.createReadStream(program.inconsistencies, {encoding: 'utf8'});
          const inconsistenciesStore = N3.Store();
          const parser = N3.Parser();

          parser.parse(inconsistenciesStream, (err, triple) => {
            if (triple) {
              inconsistenciesStore.addTriple(triple.subject, triple.predicate, triple.object);
            } else {
              console.log('all inconsistency triples in their store');
              doAll(inconsistenciesStore);
            }
          });
        } else {
          const writer = N3.Writer();
          writer.addTriples(mappingStore.getTriples());
          writer.end((error, result) => {console.log(result); validate(result).then(doAll)});
        }
      }, false);
    }});
}

function doAll(store) {
  const violationAnalyzer = new ViolationAnalyzer(store, mappingStore);
  const effectsAnalyzer = new EffectsAnalyzer(mappingStore);
  const analyzedViolations = violationAnalyzer.analyze(true);
  const scores = [];

  if (program.effects) {
    const inconsistencies = [];
    const effects = {};
    const termMaps = {};

    analyzedViolations.forEach(violation => {
      const inconsistency = {
        inconsistency: violation.inconsistency,
        rules: []
      };

      violation.possibleActions.forEach(action => {
        inconsistency.rules.push(action.termMap);
        action.effects = effectsAnalyzer.getEffects(action.termMap, action.element, action.termMapType);

        effects[action.termMap] = action.effects;

        if (!termMaps[action.termMap]) {
          termMaps[action.termMap] = [];
        }

        termMaps[action.termMap].push(action.element);
      });

      inconsistencies.push(inconsistency);
    });

    console.log('all effects determined');

    //console.log(inconsistencies);
    //console.log(effects);

    let scorer = new Scorer(mappingStore, inconsistencies, effects);

    const keys = Object.keys(termMaps);

    for (let i = 0; i < keys.length; i++) {
      //console.log(termMaps[i]);
      //console.log(scorer.getScore(termMaps[i]));
      const score = scorer.getScore(keys[i]);
      score.termMap = keys[i];
      score.actions = termMaps[keys[i]];
      scores.push(score);
    }
  }

  let outputStr = JSON.stringify(analyzedViolations, null, 2);

  outputStr += '\n\n';

  outputStr += JSON.stringify(scores, null, 2);

  outputStr += '\n\n';

  outputStr += scoresToCSV(scores);

  if (program.output) {
    if (!path.isAbsolute(program.output)) {
      program.output = path.join(process.cwd(), program.output);
    }

    try {
      fs.writeFileSync(program.output, outputStr);
    } catch (e) {
      console.error(`The results could not be written to the output file ${program.output}`);
    }
  } else {
    console.log(outputStr);
  }
}

function scoresToCSV(scores) {
  let csv = 'term map,score,inconsistencyScore,possibleAffectedRulesScore,number of actions,actions\n';

  for (let i = 0; i < scores.length; i ++) {
    const score = scores[i];

    const temp = score.actions.filter(function(item, pos) {
      return score.actions.indexOf(item) === pos;
    });

    csv += `${score.termMap},${score.arithmetic},${score.inconsistencyScore},${score.possibleAffectedRulesScore},${score.actions.length},${temp}\n`;
  }

  return csv;
}