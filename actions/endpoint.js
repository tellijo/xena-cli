'use strict'

const _ = require('lodash')
const program = require('commander')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')
const inquirer = require('inquirer')
const chalk = require('chalk')
const shell = require('shelljs')

const endpointAnswers = {
  mappingExists: false
}
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
  return tpl(endpointAnswers)
}

function createEndpoint(answers) {
  var file = appname + '/server/api/' + answers.name + '/' + answers.name + '.object.js'

  return Promise.try(() => shell.test('-e', file))
    .then((exists) => {
      if (exists) {
        return console.log(chalk.red('This endpoint already exists.'))
      }

      if (!shell.test('-e', appname + '/server/api/' + answers.name)) {
        shell.mkdir('-p', appname + '/server/api/' + answers.name)
        shell.chmod(755, appname + '/server/api/' + answers.name)
        console.log(chalk.green('\u2731 ') + 'creating directory: ' + chalk.blue(appname + '/server/api/' + answers.name))
        console.log('')
      }

      createFile(appname + '/server/api/' + answers.name + '/' + answers.name + '.object.js',
        readTpl('server/api/endpoint/_.object.js')
      )
      createFile(appname + '/server/api/' + answers.name + '/get.js',
        readTpl('server/api/endpoint/_get.js')
      )
      createFile(appname + '/server/api/' + answers.name + '/post.js',
        readTpl('server/api/endpoint/_post.js')
      )
      createFile(appname + '/server/api/' + answers.name + '/list.js',
        readTpl('server/api/endpoint/_list.js')
      )

      if (!answers.mappingExists) {
        createFile(appname + '/server/api/' + answers.name + '/' + answers.name + '.mapping.yaml',
          readTpl('server/api/endpoint/_.mapping.yaml')
        )
      }
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

function endpoint(name, options) {
  var mapping = appname + '/server/api/' + name + '/' + name + '.mapping.json'

  return Promise.try(() => shell.test('-e', mapping))
    .then((exists) => {
      var questions = [
        {
          type: 'input',
          name: 'name',
          message: 'What is the name of the endpoint?',
          when: () => !name
        },
        {
          type: 'confirm',
          name: 'mapping',
          message: 'It seems that there is no mapping for this endpoint yet, would you like to create one?',
          when: () => !exists
        },
        {
          type: 'input',
          name: 'fields',
          message: 'What are the fields for this mapping? (the syntax to declare a field is field:type, ex: name:string, each field separated by a space)',
          when: (answers) => !exists && answers.mapping
        }
      ]

      if (exists) {
        endpointAnswers.mappingExists = true
        endpointAnswers.fields = []
        var obj = require(mapping).properties
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            endpointAnswers.fields.push({
              name: key,
              type: obj[key].type
            })
          }
        }
      }

      if (name) {
        endpointAnswers.name = name
      }

      if (questions.length) {
        return inquirer.prompt(questions, (answers) => {
          if (answers.mapping && answers.fields.length) {
            answers.fields = parseFields(answers.fields.split(' '))
          }
          _.extend(endpointAnswers, answers)
          return createEndpoint(endpointAnswers)
        })
      }

      return createEndpoint(endpointAnswers)
    })
}

module.exports = program
  .command('endpoint [name]')
  .alias('e')
  .description('Generate an endpoint for the API')
  .action(endpoint)

