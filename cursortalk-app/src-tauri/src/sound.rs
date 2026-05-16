use std::process::{Command, Stdio};

pub fn play_start_sound() {
    play_sound(SoundCue::Start);
}

pub fn play_done_sound() {
    play_sound(SoundCue::Done);
}

enum SoundCue {
    Start,
    Done,
}

fn play_sound(cue: SoundCue) {
    #[cfg(target_os = "macos")]
    {
        let sound_path = match cue {
            SoundCue::Start => "/System/Library/Sounds/Pop.aiff",
            SoundCue::Done => "/System/Library/Sounds/Pop.aiff",
        };

        let _ = Command::new("afplay")
            .arg(sound_path)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }

    #[cfg(target_os = "windows")]
    {
        let script = match cue {
            SoundCue::Start => "[console]::Beep(880,100)",
            SoundCue::Done => "[console]::Beep(880,100)",
        };

        let _ = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let _ = cue;
}
