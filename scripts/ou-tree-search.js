jQuery(document).ready(function() {
    jQuery("#searchIcon").click(function() {
        console.log('searching is clicked...');
        jQuery("#searchSpan").toggle();
        jQuery("#searchField").focus();
    });

    jQuery("#searchField").autocomplete({
        source: "../dhis-web-commons/ouwt/getOrganisationUnitsByName.action",
        select: function(event, ui) {
            jQuery("#searchField").val(ui.item.value);
            selection.findByName();
        }
    });
});

