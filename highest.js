const fs = require('fs');
const ora = require('ora');
const path = require('path');
const split2 = require('split2');
const { Transform } = require('stream');

/**
 *  @module highestScores
 *  Given a data file containing scored records, output
 *  the N highest record IDs by score in descending order,
 *  highest score first. The output should be correctly
 *  formatted JSON.
 */
const highestScores = () => {
  // Exit Codes
  const FORMATTING_ERROR = 2;
  const FILE_NOT_FOUND = 1;
  const SUCCESS = 0;

  // Variable Declaration
  const spinner = ora().start('Initializing');
  let dataFilePath;
  const recStorage = [];
  const fileSplitRegex = /\r?\n/;
  const recordSplitRegex = /:\s*(?={)/;

  /**
   *  Transform Stream responsible for
   *  splitting each record into it's score
   *  and JSON Dictionary. Expects each
   *  chunk to be a line from data file (WritableStream).
   *  Outputs an Array of 2 elements (ReadableStream).
   */
  const recordSplitter = new Transform(
    {
      readableObjectMode: true,
      transform(record, encoding, callback) {
        // split score from JSON Dictionary
        // generate output as an Array
        // if empty line, ignore and move to next record
        const recordAsString = record.toString();
        if (recordAsString.length > 0) {
          this.push(recordAsString.split(recordSplitRegex));
        }
        callback();
      },
    },
  );

  /**
   *  Transform Stream responsible for
   *  extracting from JSON Dictionary and
   *  converting from Array of Elements into
   *  a singular Object. Expects an Array
   *  of 2 elements (WritableStream). Outputs
   *  an Object representing a record (ReadableStream).
   */
  const arrayToObject = new Transform(
    {
      readableObjectMode: true,
      writableObjectMode: true,
      transform(chunk, encoding, callback) {
        const { id } = JSON.parse(chunk[1], (key, value) => {
          if (key === 'id' || key === '') return value;
          return undefined;
        });

        // Validate data
        // for each row JSON dictionary contains a "id" key
        // else input formatting error exit with code 2
        if (!id) {
          callback(new Error('Formatting Error'));
        } else {
          // generate output as an Object
          this.push({ score: +chunk[0], id });
          callback();
        }
      },
    },
  );

  /** Determine command line arguments */
  try {
    // dataFile expected at index 2
    // If file not found exit with code 1
    dataFilePath = path.resolve(__dirname, process.argv[2]);
    if (!fs.existsSync(dataFilePath)) {
      throw new Error('Specified file does not exist');
    }
  } catch (err) {
    spinner.fail('Invalid data file');
    process.exitCode = FILE_NOT_FOUND;
    return;
  }
  // Number of highest records to display expected at index 3
  // Default to single highest record if not provided
  const nHighestRecs = Number(process.argv[3]) || 1;


  /** Process data File */
  spinner.text = 'Processing data file';
  const dataFileStream = fs.createReadStream(dataFilePath);
  dataFileStream
    .pipe(split2(fileSplitRegex))
    .on('close', () => {
      // cleanup
      dataFileStream.destroy();
    })
    .pipe(recordSplitter)
    .pipe(arrayToObject)
    .on('data', (obj) => {
      // accumulate for sorting
      recStorage.push(obj);
    })
    .on('error', (err) => {
      spinner.fail(err);
      process.exitCode = FORMATTING_ERROR;
    });

  dataFileStream.on('close', () => {
    // sort records
    spinner.text = 'Sorting records';
    recStorage.sort((a, b) => {
      if (a.score > b.score) return -1;
      return 1;
    });
    // display requested records
    // output should be correctly formatted JSON
    spinner.succeed('Completed!');
    spinner.info(JSON.stringify(recStorage.slice(0, nHighestRecs), null, 2));

    // N highest scores processed successfully exit code 0
    process.exitCode = SUCCESS;
  });
};

highestScores();

module.exports = highestScores;
