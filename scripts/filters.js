'use strict';

/* Filters */

var excelUploadFilters = angular.module('excelUploadFilters', [])

.filter('chosenFilter', function(){
    return function(data, index) {
        if(!data){
            return;
        }
        if(!index){
            return data;
        }
        
        var filteredData = [];
        for(var i=0; i<data.length; i++){
            if(!data[i].assigned){
                filteredData.push(data[i]);
            }
            else{
                if(data[i].assignedColumn === index || data[i].assignedRow === index){
                    filteredData.push(data[i]);
                }
            }            
        }        
        return filteredData;       
    };
});