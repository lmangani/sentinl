import { get, isNumber } from 'lodash';
import moment from 'moment';

function ReportsController($rootScope, $scope, $route, $interval,
  $timeout, timefilter, Private, createNotifier, $window, $uibModal,
  navMenu, globalNavState, reportFactory, COMMON, confirmModal, sentinlLog) {
  'ngInject';

  $scope.title = COMMON.reports.title;
  $scope.description = COMMON.description;

  $scope.topNavMenu = navMenu.getTopNav('reports');
  $scope.tabsMenu = navMenu.getTabs('reports');

  const notify = createNotifier({
    location: COMMON.reports.title,
  });
  const log = sentinlLog;
  log.initLocation(COMMON.reports.title);

  $scope.reportService = reportFactory.get();

  function errorMessage(err) {
    log.error(err);
    notify.error(err);
  }

  timefilter.enabled = true;
  try {
    timefilter.enableAutoRefreshSelector();
    timefilter.enableTimeRangeSelector();
  } catch (err) {
    log.warn('Kibana v6.2.X feature:', err);
  }

  /* First Boot */

  $scope.reports = [];
  $scope.timeInterval = timefilter.time;

  $scope.isData = function (report) {
    return report._source.attachment && report._source.attachment[1].data;
  };

  $scope.isScreenshot = function (report) {
    return report._source.attachment[1].data.charAt(0) === 'i';
  };

  const getReports = function (interval) {
    $scope.reportService.updateFilter(interval)
      .then((resp) => {
        return $scope.reportService.list().then((resp) => $scope.reports = resp);
      })
      .catch(errorMessage);
  };

  getReports($scope.timeInterval);

  $scope.$listen(timefilter, 'fetch', (res) => {
    getReports($scope.timeInterval);
  });

  /* Listen for refreshInterval changes */

  $rootScope.$watchCollection('timefilter.time', function (newvar, oldvar) {
    if (newvar === oldvar) { return; }
    let timeInterval = get($rootScope, 'timefilter.time');
    if (timeInterval) {
      $scope.timeInterval = timeInterval;
      $scope.reportService.updateFilter($scope.timeInterval)
        .catch(errorMessage);
    }
  });

  $rootScope.$watchCollection('timefilter.refreshInterval', function () {
    let refreshValue = get($rootScope, 'timefilter.refreshInterval.value');
    let refreshPause = get($rootScope, 'timefilter.refreshInterval.pause');

    // Kill any existing timer immediately
    if ($scope.refreshreports) {
      $timeout.cancel($scope.refreshreports);
      $scope.refreshreports = undefined;
    }

    // Check if Paused
    if (refreshPause) {
      if ($scope.refreshreports) {
        $timeout.cancel($scope.refreshreports);
      }
      return;
    }

    // Process New Filter
    if (refreshValue !== $scope.currentRefresh && refreshValue !== 0) {
      // new refresh value
      if (isNumber(refreshValue) && !refreshPause) {
        $scope.newRefresh = refreshValue;
        // Reset Interval & Schedule Next
        $scope.refreshreports = $timeout(function () {
          $route.reload();
        }, refreshValue);
        $scope.$watch('$destroy', $scope.refreshreports);
      } else {
        $scope.currentRefresh = 0;
        $timeout.cancel($scope.refreshreports);
      }

    } else {
      $timeout.cancel($scope.refreshreports);
    }

  });

  /**
  * Delete report
  *
  * @param {integer} index of report on Reports page
  * @param {object} report
  */
  $scope.deleteReport = function (index, report) {
    async function doDelete() {
      try {
        const resp = await $scope.reportService.delete(report._id, report._index);
        $scope.reports.splice(index - 1, 1);
        notify.info(`Deleted report ${resp}`);
        getReports($scope.timeInterval);
      } catch (err) {
        errorMessage(err);
      }
    }

    const confirmModalOptions = {
      onConfirm: doDelete,
      confirmButtonText: 'Delete report',
    };

    confirmModal('Are you sure you want to delete the report?', confirmModalOptions);
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

export default ReportsController;
