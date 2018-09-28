/* global angular */
import { get, isObject, find, keys, forEach } from 'lodash';
import moment from 'moment';
import $ from 'jquery';
import ace from 'ace';

// WATCHERS CONTROLLER
function  WatchersController($rootScope, $scope, $route, $interval,
  $timeout, timefilter, Private, createNotifier, $window, $http, $uibModal, sentinlLog, navMenu,
  globalNavState, $location, dataTransfer, Promise, COMMON, confirmModal,
  wizardHelper, watcherFactory, userFactory, sentinlConfig) {
  'ngInject';

  $scope.title = COMMON.watchers.title;
  $scope.description = COMMON.description;

  const notify = createNotifier({
    location: COMMON.watchers.title,
  });
  const log = sentinlLog;
  log.initLocation(COMMON.watchers.title);

  function errorMessage(err) {
    log.error(err);
    notify.error(err);
  }

  $scope.topNavMenu = navMenu.getTopNav('watchers');
  $scope.tabsMenu = navMenu.getTabs();

  timefilter.enabled = false;
  $scope.watchers = [];
  $scope.wizardHelper = wizardHelper;

  $scope.watcherService = watcherFactory.get(sentinlConfig.api.type);
  $scope.userService = userFactory.get(sentinlConfig.api.type);

  $scope.inputInfo = function (watcher) {
    const index = get(watcher, 'input.search.request.index');
    if (index) return index.join(',');
    return get(watcher, 'input.search.kable.expression') || get(watcher, 'input.search.timelion.sheet');
  };

  /**
  * Run watcher on demand.
  *
  * @param {string} id - watcher id
  */
  $scope.playWatcher = async function (task) {
    try {
      const resp = await $scope.watcherService.play(task.id);
      if (resp.warning) {
        notify.warning(resp.message);
      } else {
        notify.info('watcher executed');
      }
    } catch (err) {
      errorMessage(err);
    }
  };

  /**
  * Opens watcher editor or wizard.
  *
  * @param {object} watcher - watcher object.
  * @param {string} type - editor, wizard.
  */
  $scope.editWatcher = function (watcher, type) {
    let path = `/${type}`;

    if (isObject(watcher)) {
      dataTransfer.setWatcher(watcher);
    } else {
      path += `/${watcher}`;
    }

    $location.path(path);
  };

  /**
  * Gets watcher object created by Kibana dashboard spy button.
  */
  const importWatcherFromLocalStorage = function () {
    /* New Entry from Saved Kibana Query */
    if ($window.localStorage.getItem('sentinl_saved_query')) {
      const spyPanelWatcher = angular.fromJson($window.localStorage.getItem('sentinl_saved_query'));
      $window.localStorage.removeItem('sentinl_saved_query');
      $scope.editWatcher(spyPanelWatcher, 'wizard');
    }
  };

  /**
  * Lists all existing watchers.
  */
  const listWatchers = async function () {
    return $scope.watcherService.list().then(function (resp) {
      $scope.watchers = resp;
    }).catch(errorMessage).then(function () {
      importWatcherFromLocalStorage();
    });
  };

  listWatchers();

  // List the saved watcher.
  $scope.$on('editorCtrl-Watcher.save', () => {
    listWatchers();
  });

  /**
  * Delete watcher
  *
  * @param {string} id of watcher
  */
  $scope.deleteWatcher = function (id) {
    const index = $scope.watchers.findIndex((watcher) => watcher.id === id);
    const watcher = $scope.watchers[index];

    async function doDelete() {
      try {
        await $scope.watcherService.delete(watcher.id);
        notify.info(`deleted watcher ${watcher.title}`);
        $scope.watchers.splice(index, 1);

        try {
          const user = await $scope.userService.get(watcher.id);
          await $scope.userService.delete(user.id);
          notify.info(`deleted user ${user.id}`);
        } catch (err) {
          log.warn(err.toString());
        }
      } catch (err) {
        errorMessage(err);
      }
    }

    const confirmModalOptions = {
      onConfirm: doDelete,
      confirmButtonText: 'Delete watcher',
    };

    confirmModal(`Are you sure you want to delete the watcher ${watcher.title}?`, confirmModalOptions);
  };

  /**
  * Saves watcher.
  *
  * @param {integer} index - index number of watcher in $scope.watchers array.
  */
  const saveWatcher = function (index) {
    $scope.watcherService.save($scope.watchers[index])
      .then(function (id) {
        const status = $scope.watchers[index].disable ? 'Disabled' : 'Enabled';
        const watcher = find($scope.watchers, (watcher) => watcher.id === id);
        notify.info(`${status} watcher "${watcher.title}"`);
      })
      .catch(errorMessage);
  };

  /**
  * Enables or disables watcher.
  *
  * @param {string} id - watcher id.
  */
  $scope.toggleWatcher = function (id) {
    const index = $scope.watchers.findIndex((watcher) => watcher.id === id);
    $scope.watchers[index].disable = !$scope.watchers[index].disable;
    saveWatcher(index);
  };

  /**
  * Creates new watcher.
  *
  * @param {string} type - action type (email, report).
  */
  $scope.newWatcher = function (type) {
    $scope.watcherService.new(type)
      .then((watcher) => $scope.editWatcher(watcher, 'editor'))
      .catch(errorMessage);
  };

  const currentTime = moment($route.current.locals.currentTime);
  $scope.currentTime = currentTime.format('HH:mm:ss');
  const utcTime = moment.utc($route.current.locals.currentTime);
  $scope.utcTime = utcTime.format('HH:mm:ss');
  const unsubscribe = $interval(function () {
    $scope.currentTime = currentTime.add(1, 'second').format('HH:mm:ss');
    $scope.utcTime = utcTime.add(1, 'second').format('HH:mm:ss');
  }, 1000);
  $scope.$watch('$destroy', unsubscribe);

};

export default WatchersController;
