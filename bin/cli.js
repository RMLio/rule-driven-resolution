#!/usr/bin/env node
/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const program           = require('commander');
const fs                = require('fs');
const path              = require('path');
const pkginfo           = require('pkginfo');
const normalizeRML      = require('normalize-rml').normalizeRml;
const validate          = require('../lib/validate');
const ViolationAnalyzer = require('../lib/violationanalyzer.js');
const EffectsAnalyzer   = require('../lib/effectsanalyzer.js');
const N3                = require('n3');
const Scorer                = require('../lib/scorer.js');

pkginfo(module, 'version');

program.version(module.exports.version);
program.option('-i, --input <input>', 'input file');
program.option('-o, --output <output>', 'output file (default: stdout)');
program.option('-e, --effects', 'TODO');
program.parse(process.argv);

if (!program.input) {
  console.error('Please provide an input file.');
} else {
  if (!path.isAbsolute(program.input)) {
    program.input = path.join(process.cwd(), program.input);
  }

  const mapping = fs.readFileSync(program.input, 'utf-8');

  validate(mapping).then((store) => {
    const parser = N3.Parser();
    const mappingStore = N3.Store();

    parser.parse(mapping, (err, triple) => {
      if (triple) {
        mappingStore.addTriple(triple.subject, triple.predicate, triple.object);
      } else {
        normalizeRML(mappingStore, () => {
          const violationAnalyzer = new ViolationAnalyzer(store, mappingStore);
          const effectsAnalyzer = new EffectsAnalyzer(mappingStore);
          const analyzedViolations = violationAnalyzer.analyze(true);

          if (program.effects) {
            const inconsistencies = [];
            const effects = {};
            const termMaps = [];

            analyzedViolations.forEach(violation => {
              const inconsistency = {
                inconsistency: violation.inconsistency,
                rules: []};

              violation.possibleActions.forEach(action => {
                inconsistency.rules.push(action.termMap);
                action.effects = effectsAnalyzer.getEffects(action.termMap, action.element);

                effects[action.termMap] = action.effects;
                termMaps.push(action.termMap);
              });

              inconsistencies.push(inconsistency);
            });

            console.log(inconsistencies);
            console.log(effects);

            let scorer = new Scorer(mappingStore, inconsistencies, effects);

            for(let i = 0; i < termMaps.length; i ++) {
              console.log(termMaps[i]);
              console.log(scorer.getScore(termMaps[i]));
            }
          }

          const outputStr = JSON.stringify(analyzedViolations, null, 2);

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
        });
      }
    });
  });
}