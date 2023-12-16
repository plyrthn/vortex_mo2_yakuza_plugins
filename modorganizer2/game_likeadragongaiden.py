from __future__ import annotations

import os

import mobase
from PyQt6.QtCore import QFileInfo

from ..basic_game import BasicGame
from .yakuza.yakuza_series import YakuzaGameModDataChecker, yakuza_check_rmm, yakuza_import_mods


class LikeADragonGaidenGame(BasicGame):

    __yakuza_exe_dir = os.path.join('runtime', 'media')

    Name = "Like a Dragon Gaiden: The Man Who Erased His Name Support Plugin"
    Author = "SutandoTsukai181 & Piro101"
    Version = "1.0.0"

    GameName = "Like a Dragon Gaiden: The Man Who Erased His Name"
    GameShortName = "likeadragongaiden"
    GameSteamId = [2375550]
    GameBinary = os.path.join(__yakuza_exe_dir, "startup.exe") # Mods don't load with likeadragongaiden.exe
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
        'asset_aston_ngen',
        'asset_aston_ngen.par',
        'auth',
        'auth_hires',
        'battle',
        'boot',
        'camera',
        'chara',
        'chara.par',
        'chara2',
        'chara2.par',
        'cubemap_aston',
        'cubemap_aston.par',
        'db.aston.de',        
        'db.aston.de.par',
        'db.aston.en',        
        'db.aston.en.par',
        'db.aston.es',        
        'db.aston.es.par',
        'db.aston.fr',        
        'db.aston.fr.par',
        'db.aston.it',        
        'db.aston.it.par',
        'db.aston.ja',        
        'db.aston.ja.par',
        'db.aston.ko',        
        'db.aston.ko.par',
        'db.aston.pt',        
        'db.aston.pt.par',
        'db.aston.ru',        
        'db.aston.ru.par',
        'db.aston.zh',        
        'db.aston.zh.par',
        'db.aston.zhs',        
        'db.aston.zhs.par',
        'effect',
        'effect.par',
        'entity_aston',
        'entity_aston.par',
        'entity_table',
        'flood',
        'font.aston',
        'font.aston.par',
        'grass',
        'hact_aston',
        'light_anim_aston',
        'light_anim_aston.par',
        'lua',
        'lua.par',
        'map',
        'map.par',
        'minigame',
        'motion',
        'motion.par',
        'moviesd',
        'navimesh',
        'particle',
        'particle.par',
        'puid.aston',
        'reflection',
        'shader',
        'sound',
        'sound.par',
        'sound_en',
        'sound_en.par',
        'speak2',
        'stage_aston_ngen',
        'stage_common_aston',
        'stream',
        'system',
        'talk_aston',
        'talk_aston.par',
        'ui.aston.common',
        'ui.aston.common.par',
        'ui.aston.de',        
        'ui.aston.de.par',
        'ui.aston.en',        
        'ui.aston.en.par',
        'ui.aston.es',        
        'ui.aston.es.par',
        'ui.aston.fr',        
        'ui.aston.fr.par',
        'ui.aston.it',        
        'ui.aston.it.par',
        'ui.aston.ja',        
        'ui.aston.ja.par',
        'ui.aston.ko',        
        'ui.aston.ko.par',
        'ui.aston.pt',        
        'ui.aston.pt.par',
        'ui.aston.ru',        
        'ui.aston.ru.par',
        'ui.aston.zh',        
        'ui.aston.zh.par',
        'ui.aston.zhs',       
        'ui.aston.zhs.par',
        'version'
    }
