'use client';

import { SidebarLayout } from '@/shared/layout/Sidebar';

import { BasicTab } from '@/modules/settings/components/BasicTab';
import { CookiesTab } from '@/modules/settings/components/CookiesTab';
import { IntegrationsTab } from '@/modules/settings/components/IntegrationsTab';
import { SeasonalSettings } from '@/modules/settings/components/SeasonalSettings';
import { SettingsPageHeader } from '@/modules/settings/components/SettingsPageHeader';
import { SettingsTabsNav } from '@/modules/settings/components/SettingsTabsNav';
import { StorageTab } from '@/modules/settings/components/StorageTab';
import { useSettingsPageState } from '@/modules/settings/hooks/useSettingsPageState';

export default function SettingsPage() {
  const {
    activeTab,
    backupFileInputRef,
    canInstall,
    clearAllCookiesHandler,
    clearAllData,
    clearIndexedDB,
    clearLocalStorage,
    clearSeasonalData,
    handleClearScraperCache,
    currentAccentColor,
    currentLanguage,
    currentTheme,
    discordConfigured,
    editPlatform,
    editValue,
    handleAccentColorChange,
    handleClearCookie,
    handleExportBackup,
    handleImportBackup,
    handleInstallApp,
    handleLanguageChange,
    handleResetExperimentalValues,
    handleSaveCookie,
    handleThemeChange,
    historyCount,
    isClearing,
    isExporting,
    isImporting,
    isInstalled,
    refreshHistoryCount,
    resolvedAutoTheme,
    setActiveTab,
    setEditPlatform,
    setEditValue,
    tabTitles,
    userCookies,
  } = useSettingsPageState();

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SettingsPageHeader activeTabTitle={tabTitles[activeTab]} />
          <SettingsTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="relative">
            {activeTab === 'basic' && (
              <BasicTab
                currentTheme={currentTheme}
                currentAccentColor={currentAccentColor}
                resolvedAutoTheme={resolvedAutoTheme}
                currentLanguage={currentLanguage}
                canInstall={canInstall}
                isInstalled={isInstalled}
                discordConfigured={discordConfigured}
                onThemeChange={handleThemeChange}
                onAccentColorChange={handleAccentColorChange}
                onLanguageChange={handleLanguageChange}
                onInstallApp={handleInstallApp}
                onNavigateToIntegrations={() => setActiveTab('integrations')}
                onResetExperimentalValues={handleResetExperimentalValues}
              >
                <SeasonalSettings />
              </BasicTab>
            )}

            {activeTab === 'cookies' && (
              <CookiesTab
                userCookies={userCookies}
                editPlatform={editPlatform}
                editValue={editValue}
                isClearing={isClearing}
                onEditPlatform={setEditPlatform}
                onEditValueChange={setEditValue}
                onSaveCookie={handleSaveCookie}
                onClearCookie={handleClearCookie}
                onClearAllCookies={clearAllCookiesHandler}
              />
            )}

            {activeTab === 'storage' && (
              <StorageTab
                historyCount={historyCount}
                isClearing={isClearing}
                isExporting={isExporting}
                isImporting={isImporting}
                backupFileInputRef={backupFileInputRef}
                onRefreshHistory={refreshHistoryCount}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onClearCookies={clearAllCookiesHandler}
                onClearLocalStorage={clearLocalStorage}
                onClearIndexedDB={clearIndexedDB}
                onClearScraperCache={handleClearScraperCache}
                onClearSeasonalData={clearSeasonalData}
                onClearAllData={clearAllData}
              />
            )}

            {activeTab === 'integrations' && <IntegrationsTab />}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
