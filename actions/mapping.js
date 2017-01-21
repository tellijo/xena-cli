'use strict'

const _ = require('lodash')
const program = require('commander')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')
const inquirer = require('inquirer')
const chalk = require('chalk')
const shell = require('shelljs')

const mappingAnswers = {}
const appname = process.cwd()

function createFile(file, str) {
  fs.writeFile(file, str)
  console.log(chalk.green('\u2713 ') + 'creating file: ' + chalk.blue(file))
}

function readTpl(file) {
  var str = fs.readFileSync(path.join(__dirname, '../templates/', file), {encoding: 'utf8'})
  var tpl = _.template(str, {
    imports: {
      _: _
    }
  })
  return tpl(mappingAnswers)
}

function createMapping(answers) {
  var file = `${appname}/server/api/${answers.mapping}/${answers.mapping}.mapping.json`

  return Promise.try(() => shell.test('-e', file))
    .then((exists) => {
      if (exists) {
        return console.log(chalk.red('This mapping already exists.'))
      }

      if (!shell.test('-e', `${appname}/server/api/${answers.mapping}`)) {
        shell.mkdir('-p', `${appname}/server/api/${answers.mapping}`)
        shell.chmod(755, `${appname}/server/api/${answers.mapping}`)
        console.log(chalk.green('\u2731 ') + 'creating directory: ' + chalk.blue(`${appname}/server/api/${answers.mapping}`))
        console.log('')
      }

      createFile(file, readTpl('server/api/endpoint/_.mapping.json'))
    })
    .catch((err) => {
      console.log(chalk.red('Don\'t die Gabrielle!'))
      throw new Error(err.stack)
    })
    .return('')
    .tap(() => console.log(''))
}

function parseFields(fields) {
  var aFields = []

  for (var i = 0, l = fields.length; i < l; i++) {
    var field = fields[i].split(':')
    aFields.push({
      name: field[0],
      type: field[1]
    })
  }

  return aFields
}

function mapping(name, fields, options) {
  var questions = [
    {
      type: 'input',
      name: 'mapping',
      message: 'What is the name of the mapping?',
      when: function() {
        return !name
      }
    },
    {
      type: 'input',
      name: 'fields',
      message: 'What are the fields for this mapping? (the syntax to declare a field is field:type, ex: name:string, each field separated by a space)',
      when: function() {
        return !fields || !fields.length
      }
    }
  ]

  if (name) {
    mappingAnswers.mapping = name
  }

  if (fields && fields.length) {
    mappingAnswers.fields = parseFields(fields)
  }

  if (questions.length) {
    return inquirer.prompt(questions, function(answers) {
      answers.fields = parseFields(answers.fields.split(' '))
      _.extend(mappingAnswers, answers)
      return createMapping(mappingAnswers)
    })
  }

  return createMapping(mappingAnswers)
}

module.exports = program
  .command('mapping [name] [fields...]')
  .alias('m')
  .description('Generate a mapping file')
  .action(mapping)

