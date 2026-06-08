package com.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class SubtitleItem(
    val id: String,
    val startTime: Float,
    val endTime: Float,
    val text: String,
    val speaker: String
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    CaptionCompanionDashboard(
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptionCompanionDashboard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // 1. Core State
    var subtitles by remember {
        mutableStateOf(
            listOf(
                SubtitleItem("1", 0.5f, 3.2f, "Welcome back to the CaptionFlow design workspace!", "Speaker 1"),
                SubtitleItem("2", 3.5f, 6.8f, "Today we analyze high-performance overlay setups.", "Speaker 2"),
                SubtitleItem("3", 7.2f, 10.0f, "This workspace is optimized for fast subtitle syncing.", "Speaker 1")
            )
        )
    }

    var currentTime by remember { mutableStateOf(0f) }
    var isPlaying by remember { mutableStateOf(false) }
    val duration = 12.0f

    // Overlay style configurations
    var selectedFontFamily by remember { mutableStateOf("Sans") }
    var selectedColor by remember { mutableStateOf(Color(0xFF60A5FA)) } // blue-400
    var activePreset by remember { mutableStateOf("Karaoke Highlight") }

    // Selected / Active Edit Form States
    var editingSubId by remember { mutableStateOf<String?>(null) }
    var inputStartTime by remember { mutableStateOf("") }
    var inputEndTime by remember { mutableStateOf("") }
    var inputText by remember { mutableStateOf("") }
    var inputSpeaker by remember { mutableStateOf("") }

    // Playhead simulation ticker
    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            val stepMs = 50L
            while (isPlaying) {
                delay(stepMs)
                val nextTime = currentTime + (stepMs / 1000f)
                if (nextTime >= duration) {
                    currentTime = 0f
                    isPlaying = false
                } else {
                    currentTime = nextTime
                }
            }
        }
    }

    // Find currently active subtitle
    val activeSub = subtitles.find { currentTime >= it.startTime && currentTime <= it.endTime }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF020617)) // Slate 950
            .padding(16.dp)
    ) {
        // --- HEADER ROW ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Between
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF2563EB)), // Blue 600
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.List,
                        contentDescription = "Logo",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "CaptionFlow Mobile",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Companion Sync Studio",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF1E293B))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color(0xFF22C55E)) // Green status
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Dev Local Link",
                        color = Color(0xFF94A3B8),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // --- SIMULATED VIDEO FRAME / CANVAS (Bento Area 1) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(16.dp))
                .background(Color.Black),
            contentAlignment = Alignment.Center
        ) {
            // Audio wave visualizer feedback loops
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                for (i in 0 until 18) {
                    val factor = if (isPlaying) {
                        (Math.sin((currentTime * 10f) + i).toFloat() + 1f) / 2f
                    } else {
                        0.25f
                    }
                    val heightDp = (40 + factor * 80).dp
                    Box(
                        modifier = Modifier
                            .width(6.dp)
                            .height(heightDp)
                            .background(
                                Color(0xFF1E293B).copy(alpha = 0.4f)
                            )
                    )
                }
            }

            // Interactive Subtitle Overlay Render
            if (activeSub != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 36.dp, start = 16.dp, end = 16.dp)
                        .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        if (activePreset == "Speaker Accent") {
                            Text(
                                text = "[ ${activeSub.speaker.uppercase()} ]",
                                color = Color(0xFFFBBF24), // amber
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(bottom = 2.dp)
                            )
                        }
                        Text(
                            text = activeSub.text,
                            color = selectedColor,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            fontFamily = if (selectedFontFamily == "Monospace") FontFamily.Monospace else FontFamily.SansSerif
                        )
                    }
                }
            } else {
                Text(
                    text = "[ Simulation Frame - No Captions Active ]",
                    color = Color.White.copy(alpha = 0.3f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Light
                )
            }

            // Playhead Time overlay text
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = String.format("%.2f s / %.2f s", currentTime, duration),
                    color = Color(0xFFCBD5E1),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // --- MEDIA CONTROLS BAR ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(
                onClick = {
                    isPlaying = !isPlaying
                },
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF2563EB))
                    .size(40.dp)
            ) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = "PlayPause",
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Slider(
                value = currentTime,
                onValueChange = { currentTime = it },
                valueRange = 0f..duration,
                modifier = Modifier.weight(1f),
                colors = SliderDefaults.colors(
                    activeTrackColor = Color(0xFF2563EB),
                    inactiveTrackColor = Color(0xFF1E293B)
                )
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = {
                    currentTime = 0f
                    isPlaying = false
                },
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF1E293B))
                    .size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Restart",
                    tint = Color.White
                )
            }
        }

        // --- SUBTITLE WORKSPACE SECTIONS DRAWERS ---
        TabRow(
            selectedTabIndex = if (editingSubId == null) 0 else 1,
            containerColor = Color(0xFF0F172A),
            contentColor = Color(0xFF60A5FA),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
        ) {
            Tab(
                selected = (editingSubId == null),
                onClick = { editingSubId = null },
                text = { Text("Timelines", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = (editingSubId != null),
                onClick = {
                    // Switch to edit/create a new entry
                    if (editingSubId == null) {
                        editingSubId = "NEW"
                        inputStartTime = String.format("%.1f", currentTime)
                        inputEndTime = String.format("%.1f", (currentTime + 2.5f).coerceAtMost(duration))
                        inputText = ""
                        inputSpeaker = "Speaker 1"
                    }
                },
                text = { Text(if (editingSubId == "NEW" || editingSubId == null) "Add Subtitle" else "Modify Segment", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // --- MULTIPLE VIEWS RENDER ZONE ---
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            if (editingSubId == null) {
                // VIEW 1: SCROLLABLE SUBTITLES MANUSCRIP list
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        // Presets Row Selection helper
                        Text(
                            text = "Aesthetic Overlay Presets",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            val presetsList = listOf("Karaoke Highlight", "Speaker Accent", "Classic Slate")
                            presetsList.forEach { preset ->
                                val active = (activePreset == preset)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (active) Color(0xFF2563EB) else Color(0xFF1E293B))
                                        .clickable {
                                            activePreset = preset
                                            when (preset) {
                                                "Karaoke Highlight" -> {
                                                    selectedColor = Color(0xFFFBBF24)
                                                    selectedFontFamily = "Monospace"
                                                }
                                                "Speaker Accent" -> {
                                                    selectedColor = Color(0xFF60A5FA)
                                                    selectedFontFamily = "Sans"
                                                }
                                                "Classic Slate" -> {
                                                    selectedColor = Color.White
                                                    selectedFontFamily = "Sans"
                                                }
                                            }
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = preset,
                                        color = if (active) Color.White else Color(0xFF94A3B8),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Interactive Sync Manuscripts",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                    }

                    items(subtitles, key = { it.id }) { item ->
                        val isCurrentMatch = (currentTime >= item.startTime && currentTime <= item.endTime)
                        val borderColor = if (isCurrentMatch) Color(0xFF2563EB) else Color(0xFF1E293B)
                        val cardBg = if (isCurrentMatch) Color(0xFF0F172A) else Color(0xFF131B2E)

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                .clickable {
                                    currentTime = item.startTime
                                },
                            colors = CardDefaults.cardColors(containerColor = cardBg)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = item.speaker,
                                            color = Color(0xFF2563EB),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = String.format("%.1fs -> %.1fs", item.startTime, item.endTime),
                                            color = Color(0xFF64748B),
                                            fontSize = 10.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = item.text,
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                Row {
                                    IconButton(
                                        onClick = {
                                            editingSubId = item.id
                                            inputStartTime = item.startTime.toString()
                                            inputEndTime = item.endTime.toString()
                                            inputText = item.text
                                            inputSpeaker = item.speaker
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Edit,
                                            contentDescription = "Edit",
                                            tint = Color(0xFF60A5FA),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }

                                    IconButton(
                                        onClick = {
                                            subtitles = subtitles.filter { it.id != item.id }
                                            Toast.makeText(context, "Removed subtitle segment", Toast.LENGTH_SHORT).show()
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Delete",
                                            tint = Color(0xFFEF4444),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(12.dp))
                        // Mobile Export Center
                        Text(
                            text = "Export Captain Manuscripts",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("SRT", "VTT", "TXT").forEach { format ->
                                Button(
                                    onClick = {
                                        Toast.makeText(
                                            context,
                                            "Composed exports flow: Saved subtitle_comp.$format successfully to local storage!",
                                            Toast.LENGTH_LONG
                                        ).show()
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp)),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF1E293B)
                                    )
                                ) {
                                    Text(format, fontSize = 10.sp, color = Color.White)
                                }
                            }
                        }
                    }
                }
            } else {
                // VIEW 2: ADD / EDIT WORKSPACE CAPTIONS FORM
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = if (editingSubId == "NEW") "CREATE NEW SUBTITLE" else "MODIFY INSTANCE TIME",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = inputStartTime,
                            onValueChange = { inputStartTime = it },
                            label = { Text("Start Time (s)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = TextFieldDefaults.outlinedTextFieldColors(
                                textColor = Color.White,
                                focusedBorderColor = Color(0xFF2563EB),
                                unfocusedBorderColor = Color(0xFF334155)
                            )
                        )

                        OutlinedTextField(
                            value = inputEndTime,
                            onValueChange = { inputEndTime = it },
                            label = { Text("End Time (s)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = TextFieldDefaults.outlinedTextFieldColors(
                                textColor = Color.White,
                                focusedBorderColor = Color(0xFF2563EB),
                                unfocusedBorderColor = Color(0xFF334155)
                            )
                        )
                    }

                    OutlinedTextField(
                        value = inputSpeaker,
                        onValueChange = { inputSpeaker = it },
                        label = { Text("Speaker Name", fontSize = 10.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            textColor = Color.White,
                            focusedBorderColor = Color(0xFF2563EB),
                            unfocusedBorderColor = Color(0xFF334155)
                        )
                    )

                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        label = { Text("Subtitle Caption Manuscript Text", fontSize = 10.sp) },
                        modifier = Modifier // Fill and take most remaining space
                            .fillMaxWidth()
                            .height(60.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            textColor = Color.White,
                            focusedBorderColor = Color(0xFF2563EB),
                            unfocusedBorderColor = Color(0xFF334155)
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                editingSubId = null
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                        ) {
                            Text("Cancel", color = Color.White)
                        }

                        Button(
                            onClick = {
                                val sTime = inputStartTime.toFloatOrNull() ?: 0.0f
                                val eTime = inputEndTime.toFloatOrNull() ?: 5.0f

                                if (inputText.isBlank()) {
                                    Toast.makeText(context, "Text cannot be empty!", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }

                                if (editingSubId == "NEW") {
                                    val newId = "sub_" + (subtitles.size + 1)
                                    val newSub = SubtitleItem(newId, sTime, eTime, inputText, inputSpeaker)
                                    subtitles = (subtitles + newSub).sortedBy { it.startTime }
                                    Toast.makeText(context, "New Subtitle inserted successfully", Toast.LENGTH_SHORT).show()
                                } else {
                                    subtitles = subtitles.map {
                                        if (it.id == editingSubId) {
                                            SubtitleItem(it.id, sTime, eTime, inputText, inputSpeaker)
                                        } else {
                                            it
                                        }
                                    }.sortedBy { it.startTime }
                                    Toast.makeText(context, "Subtitle segment updated!", Toast.LENGTH_SHORT).show()
                                }
                                editingSubId = null
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                        ) {
                            Text("Save", color = Color.White)
                        }
                    }
                }
            }
        }
    }
}
