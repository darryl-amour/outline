const fs = require('fs');
const ora = require('ora');
const path = require('path');
const uuidv4 = require('uuid/v4');
const { Readable } = require('stream');

// Declare Variables
const recordsToGenerate = 1000000;
const spinner = ora('Initializing...').start();

/**
 * Higher order function used to generate unique
 * scores
 */
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

/**
 * Readable Stream that generates sample score records
 */
const recordGenStream = new Readable(
  {
    encoding: 'utf8',
    objectMode: true,
    read(size) {
      // There is a demand for data

      /** Generate records */
      spinner.text = 'Streaming score record(s)...';

      // Build Record
      this.jsonDict.id = uuidv4();
      this.jsonDict.type = this.type[this.counter % 2];
      this.jsonDict.y = this.counter;
      this.jsonDict.x = this.counter + Math.ceil(Math.random() * 100);
      this.jsonDict.payload = 'payload data'.repeat(this.counter);
      // increment counter of records
      this.counter += 1;
      this.push(`${this.scoreGenerator()}: ${JSON.stringify(this.jsonDict)}\n`);

      // No more records
      if (this.counter >= recordsToGenerate) {
        spinner.succeed('Generated score records');
        spinner.start();
        this.push(null);
      }
    },
  },
);

/** Customize recordGenStream */

// Generate unique score for each record
recordGenStream.scoreGenerator = randomizeScore(recordsToGenerate);
recordGenStream.type = ['purple', 'black'];
recordGenStream.jsonDict = {};
recordGenStream.counter = 0;

/**
 * Initiate piping of sample score records from readable stream
 * to disk.
 */
const createScoreRecords = () => {
  // overwrite score_recs.data file within data folder
  const dest = fs.createWriteStream(path.resolve(__dirname, '../data/score_recs.data'));

  dest.on('finish', () => {
    spinner.succeed('Score records have been saved');
    spinner.info(`Path: ${path.resolve(__dirname, '../data/score_recs.data')}`);
    spinner.stop();
  });

  // stream records to file
  recordGenStream.pipe(dest);
};

createScoreRecords();

module.exports = createScoreRecords;
