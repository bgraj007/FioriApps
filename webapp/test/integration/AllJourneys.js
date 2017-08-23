jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
		"sap/ui/test/Opa5",
		"BillManagerWorklist/test/integration/pages/Common",
		"sap/ui/test/opaQunit",
		"BillManagerWorklist/test/integration/pages/Worklist",
		"BillManagerWorklist/test/integration/pages/Object",
		"BillManagerWorklist/test/integration/pages/NotFound",
		"BillManagerWorklist/test/integration/pages/Browser",
		"BillManagerWorklist/test/integration/pages/App"
	], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "BillManagerWorklist.view."
	});

	sap.ui.require([
		"BillManagerWorklist/test/integration/WorklistJourney",
		"BillManagerWorklist/test/integration/ObjectJourney",
		"BillManagerWorklist/test/integration/NavigationJourney",
		"BillManagerWorklist/test/integration/NotFoundJourney",
		"BillManagerWorklist/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});