package com.codex.calldetection

import expo.modules.kotlin.modules.Module

class CallDetectionPackage : expo.modules.kotlin.ExpoModulesPackage {
    override fun createModules(): List<Module> {
        return listOf(CallDetectionModule())
    }
}

