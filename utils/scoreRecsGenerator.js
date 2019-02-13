const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');

const recordsToGenerate = 1000;
const type = ['purple', 'black'];

// overwrite score_recs.data file within data folder
const dest = fs.createWriteStream(path.resolve(__dirname, '../data/score_recs.data'));

const randomizeScore = (x) => {
  const scores = new Set();
  const seed = x;
  return () => {
    let score;
    // memoize scores so they are unique
    do {
      score = Math.floor((Math.random() * seed) + 1);
    } while (scores.has(score));
    scores.add(score);
    return score;
  };
};

// Generate unique score for each record
const scoreGenerator = randomizeScore(recordsToGenerate);
try {
  // Generate records
  for (let i = 0; i < recordsToGenerate; i += 1) {
    const jsonDict = {};
    const score = scoreGenerator();

    // Build Record
    jsonDict.id = uuidv4();
    jsonDict.type = type[i % 2];
    jsonDict.y = i;
    jsonDict.x = i + Math.ceil(Math.random() * 100);
    jsonDict.payload = 'payload data'.repeat(i);

    // write record to file
    dest.write(`${score}: ${JSON.stringify(jsonDict)}\n`);
  }
} catch (err) {
  console.error('Failed to generate score records.\n', err);
}

// Cleanup
dest.close();
