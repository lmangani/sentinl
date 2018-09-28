import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import { uiModules } from 'ui/modules';
// kibi: imports
import { CacheProvider } from 'ui/kibi/helpers/cache_helper';
// kibi: end

const module = uiModules.get('apps/sentinl');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedScripts',
  title: 'scripts'
});

// This is the only thing that gets injected into controllers
module.service('savedScripts', function (savedObjectsAPI, savedObjectsAPITypes, Private, SavedScript,
  kbnIndex, esAdmin, kbnUrl, $http, sentinlConfig) {
  savedObjectsAPITypes.add(sentinlConfig.es.script_type);

  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI,
    $http
  };

  const savedScriptLoader = new SavedObjectLoader(SavedScript, kbnIndex, esAdmin, kbnUrl, options);
  savedScriptLoader.urlFor = function (id) {
    return kbnUrl.eval('#/{{id}}', { id });
  };

  return savedScriptLoader;
});
