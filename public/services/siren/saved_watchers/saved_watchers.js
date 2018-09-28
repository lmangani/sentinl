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
  service: 'savedWatchers',
  title: 'watchers'
});

// This is the only thing that gets injected into controllers
module.service('savedWatchers', function (savedObjectsAPI, savedObjectsAPITypes, Private, SavedWatcher,
  kbnIndex, esAdmin, kbnUrl, $http, sentinlConfig) {
  savedObjectsAPITypes.add(sentinlConfig.es.watcher_type);

  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI,
    $http
  };

  const savedWatcherLoader = new SavedObjectLoader(SavedWatcher, kbnIndex, esAdmin, kbnUrl, options);
  savedWatcherLoader.urlFor = function (id) {
    return kbnUrl.eval('#/{{id}}', { id });
  };

  return savedWatcherLoader;
});
