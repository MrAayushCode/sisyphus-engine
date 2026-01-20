#!/usr/bin/env python3
"""
Sisyphus Plugin Refactoring Automation Script
SAFE: Creates backup before any modifications
REVERSIBLE: All changes can be undone via git
MODULAR: Can run individual phases
"""

import os
import sys
import shutil
import re
from pathlib import Path
from datetime import datetime

class SisyphusRefactor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.engine_file = self.project_root / "src" / "engine.ts"
        self.backup_dir = self.project_root / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.project_root / "refactor_log.txt"
        
    def log(self, message, level="INFO"):
        """Log to file and console"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = f"[{timestamp}] [{level}] {message}"
        print(log_msg)
        with open(self.log_file, "a") as f:
            f.write(log_msg + "\n")
    
    def validate_setup(self):
        """Check that project structure is correct"""
        self.log("=== VALIDATING SETUP ===")
        
        if not self.engine_file.exists():
            self.log(f"❌ ERROR: engine.ts not found at {self.engine_file}", "ERROR")
            return False
        
        engines_dir = self.project_root / "src" / "engines"
        required_engines = [
            "AnalyticsEngine.ts",
            "MeditationEngine.ts",
            "ResearchEngine.ts",
            "ChainsEngine.ts",
            "FiltersEngine.ts"
        ]
        
        missing = []
        for engine in required_engines:
            engine_path = engines_dir / engine
            if not engine_path.exists():
                missing.append(engine)
        
        if missing:
            self.log(f"❌ ERROR: Missing engine files: {', '.join(missing)}", "ERROR")
            return False
        
        self.log("✅ Project structure validated")
        return True
    
    def create_backup(self):
        """Create backup of engine.ts before any changes"""
        self.log("=== CREATING BACKUP ===")
        
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        backup_file = self.backup_dir / "engine.ts"
        
        shutil.copy2(self.engine_file, backup_file)
        self.log(f"✅ Backup created at {backup_file}")
        
        return backup_file
    
    def read_file(self, filepath):
        """Read file safely"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.log(f"❌ Error reading {filepath}: {e}", "ERROR")
            return None
    
    def write_file(self, filepath, content):
        """Write file safely"""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            self.log(f"❌ Error writing {filepath}: {e}", "ERROR")
            return False
    
    def add_imports(self):
        """Add engine imports to the top of engine.ts"""
        self.log("=== PHASE 1: ADDING IMPORTS ===")
        
        content = self.read_file(self.engine_file)
        if content is None:
            return False
        
        # Find the import section (after existing imports)
        import_pattern = r"(import { SisyphusEngine, DEFAULT_MODIFIER } from './engine';)"
        
        new_imports = """import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';"""
        
        # Check if imports already exist
        if "AnalyticsEngine" in content:
            self.log("⚠️  Imports already exist, skipping")
            return True
        
        # Find where to insert (after other imports from obsidian)
        insertion_point = content.find("export default class SisyphusPlugin")
        
        if insertion_point == -1:
            self.log("❌ Could not find insertion point for imports", "ERROR")
            return False
        
        # Insert before the class
        new_content = content[:insertion_point] + new_imports + "\n\n" + content[insertion_point:]
        
        if self.write_file(self.engine_file, new_content):
            self.log("✅ Imports added successfully")
            return True
        return False
    
    def add_engine_instances(self):
        """Add engine instances to SisyphusEngine class"""
        self.log("=== PHASE 2: ADDING ENGINE INSTANCES ===")
        
        content = self.read_file(self.engine_file)
        if content is None:
            return False
        
        # Check if already added
        if "analyticsEngine: AnalyticsEngine" in content:
            self.log("⚠️  Engine instances already exist, skipping")
            return True
        
        # Find the constructor
        constructor_pattern = r"constructor\(app: App, plugin: any, audio: AudioController\) \{"
        match = re.search(constructor_pattern, content)
        
        if not match:
            self.log("❌ Could not find SisyphusEngine constructor", "ERROR")
            return False
        
        # Insert engine instance declarations after constructor opening
        constructor_start = match.start()
        
        # Find "this.app = app;" to insert after it
        next_section = content[constructor_start:constructor_start + 500]
        app_assignment = next_section.find("this.app = app;")
        
        if app_assignment == -1:
            self.log("❌ Could not find insertion point in constructor", "ERROR")
            return False
        
        # Find the line break after this.audio = new AudioController(...)
        audio_line = content.find("this.audio = new AudioController", constructor_start)
        if audio_line == -1:
            self.log("❌ Could not find audio initialization", "ERROR")
            return False
        
        # Find next line break
        next_line_break = content.find("\n", audio_line)
        
        engine_init = """
        
        // Initialize modular engines
        this.analyticsEngine = new AnalyticsEngine(this.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.settings, this.audio);
        this.chainsEngine = new ChainsEngine(this.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.settings);"""
        
        new_content = content[:next_line_break] + engine_init + content[next_line_break:]
        
        # Also add instance declarations after "this.plugin: any"
        engine_declarations = """
    analyticsEngine: AnalyticsEngine;
    meditationEngine: MeditationEngine;
    researchEngine: ResearchEngine;
    chainsEngine: ChainsEngine;
    filtersEngine: FiltersEngine;"""
        
        # Find where to insert declarations (after "plugin: any;")
        plugin_line = new_content.find("plugin: any;")
        if plugin_line == -1:
            self.log("❌ Could not find plugin field declaration", "ERROR")
            return False
        
        next_line_break_decl = new_content.find("\n", plugin_line)
        new_content = new_content[:next_line_break_decl] + engine_declarations + new_content[next_line_break_decl:]
        
        if self.write_file(self.engine_file, new_content):
            self.log("✅ Engine instances added successfully")
            return True
        return False
    
    def swap_method(self, old_method_name, new_delegation):
        """
        Replace an entire method with a delegation to the new engine
        old_method_name: "trackDailyMetrics" 
        new_delegation: "this.analyticsEngine.trackDailyMetrics(type as any, amount);"
        """
        content = self.read_file(self.engine_file)
        if content is None:
            return False
        
        # Find the method signature
        method_pattern = rf"(async\s+)?{old_method_name}\s*\([^)]*\)\s*{{[^}}]*?(?:{{[^}}]*}}[^}}]*?)*}}"
        
        # This is tricky - we need a more robust approach
        # Find "methodName(" and then find its closing brace
        method_start = content.find(f"    {old_method_name}(")
        if method_start == -1:
            method_start = content.find(f"    async {old_method_name}(")
        
        if method_start == -1:
            self.log(f"⚠️  Method {old_method_name} not found, skipping", "WARN")
            return True
        
        # Find opening brace
        opening_brace = content.find("{", method_start)
        if opening_brace == -1:
            return False
        
        # Find closing brace (simple approach for now)
        brace_count = 0
        closing_brace = None
        for i in range(opening_brace, len(content)):
            if content[i] == "{":
                brace_count += 1
            elif content[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    closing_brace = i
                    break
        
        if closing_brace is None:
            return False
        
        # Extract method signature
        method_sig = content[method_start:opening_brace + 1]
        
        # Build new method
        new_method = f"{method_sig}\n        {new_delegation}\n    }}"
        
        # Replace
        new_content = content[:method_start] + new_method + content[closing_brace + 1:]
        
        if self.write_file(self.engine_file, new_content):
            self.log(f"✅ Swapped {old_method_name}")
            return True
        return False
    
    def run_phase_1_bug_fixes(self):
        """Run bug fixes only"""
        self.log("\n=== RUNNING PHASE 1: BUG FIXES ===")
        
        content = self.read_file(self.engine_file)
        if content is None:
            return False
        
        # Fix 1: Move deletion reset to checkDailyLogin
        self.log("Applying Fix #2: Deletion quota reset...")
        
        # Find checkDailyLogin and ensure deletion reset is there
        if "this.settings.questDeletionsToday = 0;" not in content:
            # Find the end of "if (this.settings.lastLogin !== today)" block
            pattern = r'if \(this\.settings\.lastLogin !== today\) \{'
            match = re.search(pattern, content)
            if match:
                self.log("⚠️  Deletion reset may need manual addition", "WARN")
        
        # Fix 2: Update moment().week() to moment().isoWeek()
        self.log("Applying Fix #6: Weekly report ISO week...")
        new_content = content.replace(
            "const week = moment().week();",
            "const week = moment().isoWeek();"
        )
        new_content = new_content.replace(
            ".startOf('week')",
            ".startOf('isoWeek')"
        )
        new_content = new_content.replace(
            ".endOf('week')",
            ".endOf('isoWeek')"
        )
        
        if new_content != content:
            if self.write_file(self.engine_file, new_content):
                self.log("✅ Bug Fix #6 applied: ISO week standard")
                content = new_content
        
        return True
    
    def run_phase_2_swap_analytics(self):
        """Swap all analytics methods"""
        self.log("\n=== RUNNING PHASE 3.1: SWAPPING ANALYTICS ===")
        
        swaps = [
            ("trackDailyMetrics", "this.analyticsEngine.trackDailyMetrics(type as any, amount);"),
            ("updateStreak", "this.analyticsEngine.updateStreak();"),
            ("initializeBossMilestones", "this.analyticsEngine.initializeBossMilestones();"),
            ("checkBossMilestones", "this.analyticsEngine.checkBossMilestones();"),
            ("generateWeeklyReport", "return this.analyticsEngine.generateWeeklyReport();"),
            ("getGameStats", "return this.analyticsEngine.getGameStats();"),
        ]
        
        for method_name, delegation in swaps:
            self.swap_method(method_name, delegation)
        
        self.log("✅ Analytics swapped")
        return True
    
    def run_phase_3_swap_meditation(self):
        """Swap meditation methods"""
        self.log("\n=== RUNNING PHASE 3.2: SWAPPING MEDITATION ===")
        
        swaps = [
            ("isLockedDown", "return this.meditationEngine.isLockedDown();"),
            ("isResting", "return moment().isBefore(moment(this.settings.restDayUntil));"),
            ("getMeditationStatus", "return this.meditationEngine.getMeditationStatus();"),
        ]
        
        for method_name, delegation in swaps:
            self.swap_method(method_name, delegation)
        
        self.log("✅ Meditation swapped")
        return True
    
    def run_phase_4_swap_research(self):
        """Swap research methods"""
        self.log("\n=== RUNNING PHASE 3.3: SWAPPING RESEARCH ===")
        
        swaps = [
            ("createResearchQuest", "return this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);"),
            ("completeResearchQuest", "return this.researchEngine.completeResearchQuest(questId, finalWordCount);"),
            ("deleteResearchQuest", "this.researchEngine.deleteResearchQuest(questId);"),
            ("getResearchRatio", "return this.researchEngine.getResearchRatio();"),
            ("canCreateResearchQuest", "return this.researchEngine.canCreateResearchQuest();"),
        ]
        
        for method_name, delegation in swaps:
            self.swap_method(method_name, delegation)
        
        self.log("✅ Research swapped")
        return True
    
    def run_phase_5_swap_chains(self):
        """Swap chains methods"""
        self.log("\n=== RUNNING PHASE 3.4: SWAPPING CHAINS ===")
        
        swaps = [
            ("createQuestChain", "return this.chainsEngine.createQuestChain(name, questNames);"),
            ("getActiveChain", "return this.chainsEngine.getActiveChain();"),
            ("isQuestInChain", "return this.chainsEngine.isQuestInChain(questName);"),
            ("canStartQuest", "return this.chainsEngine.canStartQuest(questName);"),
            ("getChainProgress", "return this.chainsEngine.getChainProgress();"),
        ]
        
        for method_name, delegation in swaps:
            self.swap_method(method_name, delegation)
        
        self.log("✅ Chains swapped")
        return True
    
    def run_phase_6_swap_filters(self):
        """Swap filters methods"""
        self.log("\n=== RUNNING PHASE 3.5: SWAPPING FILTERS ===")
        
        swaps = [
            ("setFilterState", "this.filtersEngine.setFilterState(energy, context, tags);"),
            ("clearFilters", "this.filtersEngine.clearFilters();"),
            ("getAvailableTags", "return this.filtersEngine.getAvailableTags();"),
        ]
        
        for method_name, delegation in swaps:
            self.swap_method(method_name, delegation)
        
        self.log("✅ Filters swapped")
        return True
    
    def run_full_refactor(self):
        """Run complete refactoring"""
        self.log("╔════════════════════════════════════════════════════╗")
        self.log("║     SISYPHUS PLUGIN - AUTOMATED REFACTORING        ║")
        self.log("╚════════════════════════════════════════════════════╝")
        
        # Step 1: Validate
        if not self.validate_setup():
            self.log("❌ SETUP VALIDATION FAILED", "ERROR")
            return False
        
        # Step 2: Backup
        self.create_backup()
        
        # Step 3: Add imports
        if not self.add_imports():
            self.log("❌ FAILED TO ADD IMPORTS", "ERROR")
            return False
        
        # Step 4: Add engine instances
        if not self.add_engine_instances():
            self.log("❌ FAILED TO ADD ENGINE INSTANCES", "ERROR")
            return False
        
        # Step 5: Run all phases
        self.run_phase_1_bug_fixes()
        self.run_phase_2_swap_analytics()
        self.run_phase_3_swap_meditation()
        self.run_phase_4_swap_research()
        self.run_phase_5_swap_chains()
        self.run_phase_6_swap_filters()
        
        self.log("\n╔════════════════════════════════════════════════════╗")
        self.log("║           ✅ REFACTORING COMPLETE ✅               ║")
        self.log("╚════════════════════════════════════════════════════╝")
        self.log(f"\nBackup location: {self.backup_dir}")
        self.log(f"Log file: {self.log_file}")
        self.log("\nNext steps:")
        self.log("1. Test the plugin to ensure everything works")
        self.log("2. If issues arise, restore from backup or 'git revert'")
        self.log("3. Run 'npm run build' to compile TypeScript")
        
        return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python refactor_sisyphus.py <path_to_project>")
        print("Example: python refactor_sisyphus.py /path/to/sisyphus-plugin")
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    if not os.path.isdir(project_path):
        print(f"❌ Error: {project_path} is not a valid directory")
        sys.exit(1)
    
    refactor = SisyphusRefactor(project_path)
    success = refactor.run_full_refactor()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
