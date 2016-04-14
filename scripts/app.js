/* global angular */

'use strict';

/* App Module */

var excelUpload = angular.module('excelUpload',
                    ['ui.bootstrap',
                    'ngRoute',
                    'ngCookies',
                    'ngMessages',
                    'ngSanitize',
                    'excelUploadDirectives',
                    'excelUploadControllers',
                    'excelUploadServices',
                    'excelUploadFilters',
                    'd2Filters',
                    'd2Directives',
                    'd2Services',
                    'd2Controllers',
                    'ui.select',
                    'angularGrid',
                    'pascalprecht.translate',
                    'd2HeaderBar'])

.value('DHIS2URL', '..')

.config(function ($routeProvider, $translateProvider) {

    $routeProvider.when('/home', {
        templateUrl: 'components/home/home.html',
        controller: 'HomeController'
    }).when('/manage-templates', {
        templateUrl: 'components/templates/templates.html',
        controller: 'TemplateController'
    }).when('/add-template', {
        templateUrl: 'components/add_template/addTemplate.html',
        controller: 'AddTemplateController'
    }).when('/edit-template', {
        templateUrl: 'components/edit_template/editTemplate.html',
        controller: 'EditTemplateController'
    }).when('/orgunit_mapping', {
        templateUrl: 'components/orgunit_mapping/orgunit_mapping.html',
        controller: 'OrgUnitMappingController'
    }).when('/data-import',{
        templateUrl:'components/import/import.html',
        controller: 'ImportController'
    }).when('/settings', {
        templateUrl: 'components/settings/setting.html',
        controller: 'SettingController'
    }).when('/logs', {
        templateUrl: 'components/log/log.html',
        controller: 'LogController'
    }).when('/facilitywise', {
        templateUrl: 'components/import_facilitywise/import_facilitywise.html',
        controller: 'ImportFacilitywiseController'
    }).otherwise({
        redirectTo: '/home'
    });

    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useLoader('i18nLoader');
});
