from __future__ import annotations

import os

import mobase
from PyQt6.QtCore import QFileInfo

from ..basic_game import BasicGame
from .yakuza.yakuza_series import YakuzaGameModDataChecker, yakuza_check_rmm, yakuza_import_mods


class LikeADragonInfiniteWealthGame(BasicGame):

    __yakuza_exe_dir = os.path.join('runtime', 'media')

    Name = "Like a Dragon: Infinite Wealth Support Plugin"
    Author = "SutandoTsukai181 & traxusglobal"
    Version = "1.0.0"

    GameName = "Like a Dragon: Infinite Wealth"
    GameShortName = "likeadragoninfinitewealth"
    GameSteamId = [2072450]
    GameBinary = os.path.join(__yakuza_exe_dir, "startup.exe")
    GameDataPath = os.path.join(__yakuza_exe_dir, 'mods', '_externalMods')

    def init(self, organizer: mobase.IOrganizer):
        super().init(organizer)
        self._featureMap[mobase.ModDataChecker] = YakuzaGameModDataChecker(self.__valid_paths)
        self._organizer.onUserInterfaceInitialized(lambda win: yakuza_check_rmm(self, win))
        self._organizer.onUserInterfaceInitialized(lambda win: yakuza_import_mods(self, win))
        return True

    def executables(self) -> list[mobase.ExecutableInfo]:
        return super().executables() + [mobase.ExecutableInfo(
            "Ryu Mod Manager",
            QFileInfo(self.gameDirectory().absoluteFilePath(
                os.path.join(self.__yakuza_exe_dir, 'RyuModManager.exe')))
        ).withArgument('--cli')]

    def settings(self) -> list[mobase.PluginSetting]:
        return super().settings() + [mobase.PluginSetting(
            'import_mods_prompt',
            'Check for mods to import from RMM mods folder on launch',
            True
        )]

    __valid_paths = {
    '3dlut',
    'artisan',
    'asset2_elvis_ngen.par',
    'asset_elvis_ngen.par',
    'auth',
    'auth_hires',
    'battle',
    'boot',
    'camera',
    'chara.par',
    'chara2.par',
    'cubemap2_elvis.par',
    'cubemap_elvis.par',
    'db.elvis.de.par',
    'db.elvis.en.par',
    'db.elvis.es.par',
    'db.elvis.fr.par',
    'db.elvis.it.par',
    'db.elvis.ja.par',
    'db.elvis.ko.par',
    'db.elvis.pt.par',
    'db.elvis.ru.par',
    'db.elvis.trial.de.par',
    'db.elvis.trial.en.par',
    'db.elvis.trial.es.par',
    'db.elvis.trial.fr.par',
    'db.elvis.trial.it.par',
    'db.elvis.trial.ja.par',
    'db.elvis.trial.ko.par',
    'db.elvis.trial.pt.par',
    'db.elvis.trial.ru.par',
    'db.elvis.trial.zh.par',
    'db.elvis.trial.zhs.par',
    'db.elvis.zh.par',
    'db.elvis.zhs.par',
    'effect.par',
    'entity_elvis.par',
    'entity_table',
    'flood',
    'font.elvis.par',
    'grass',
    'hact_elvis',
    'light_anim_elvis.par',
    'lua.par',
    'map.par',
    'minigame',
    'motion.par',
    'moviesd',
    'navimesh',
    'particle.par',
    'particle2.par',
    'puid.elvis',
    'reflection',
    'shader',
    'sound.par',
    'sound2_en.par',
    'sound2_zh.par',
    'sound_en.par',
    'sound_en.par.unpack',
    'sound_zh.par',
    'stage_common_elvis',
    'stage_elvis_ngen',
    'stream',
    'stream_en',
    'stream_zh',
    'system',
    'talk2_elvis.par',
    'talk_elvis.par',
    'ui.elvis.common.par',
    'ui.elvis.de.par',
    'ui.elvis.en.par',
    'ui.elvis.es.par',
    'ui.elvis.fr.par',
    'ui.elvis.it.par',
    'ui.elvis.ja.par',
    'ui.elvis.ko.par',
    'ui.elvis.pt.par',
    'ui.elvis.ru.par',
    'ui.elvis.zh.par',
    'ui.elvis.zhs.par',
    'version',
    }