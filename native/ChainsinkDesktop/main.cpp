#include <QApplication>
#include <QMainWindow>
#include <QTabWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QTextEdit>
#include <QGroupBox>
#include <QString>
#include <QListWidget>
#include <QDebug>

#include "src/core/forensic_orchestrator.hpp"
#include "src/core/ingestion_wizard.hpp"

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget* parent = nullptr) : QMainWindow(parent) {
        auto* central = new QWidget(this);
        auto* root = new QVBoxLayout(central);

        auto* header = new QHBoxLayout();
        auto* title = new QLabel("ChainSink Forensics");
        title->setStyleSheet("font-size: 24px; font-weight: 600;");
        header->addWidget(title);

        auto* refreshButton = new QPushButton("Re-Commit Root");
        header->addStretch();
        header->addWidget(refreshButton);
        root->addLayout(header);

        tabs = new QTabWidget(this);
        tabs->addTab(buildCanvasTab(), "Forensics Canvas");
        tabs->addTab(buildIngestionTab(), "Ingestion Wizard");
        tabs->addTab(buildComplianceTab(), "Compliance Registry");
        tabs->addTab(buildBenchmarkTab(), "Benchmark & Research");
        root->addWidget(tabs);

        setCentralWidget(central);
        resize(1200, 780);

        connect(refreshButton, &QPushButton::clicked, this, [this]() {
            auto result = engine.loadPreset("VICTIM_SCAM_PEEL");
            setSummaryText(result);
        });
    }

private:
    QTabWidget* tabs = nullptr;
    chainsink::ChainSinkForensicEngine engine;

    QWidget* buildCanvasTab() {
        auto* widget = new QWidget(this);
        auto* layout = new QVBoxLayout(widget);
        auto* label = new QLabel("Active Case: Victim-Reported Phishing & 6-Hop Peel Chain UTXO Dump");
        label->setStyleSheet("color: #3dd7ff; font-weight: 600;");
        layout->addWidget(label);

        auto* info = new QLabel("Entities Clustered: 8\nPeel Chains: 1\nReported Stolen: 48.5 BTC");
        info->setWordWrap(true);
        layout->addWidget(info);
        return widget;
    }

    QWidget* buildIngestionTab() {
        auto* widget = new QWidget(this);
        auto* layout = new QVBoxLayout(widget);
        auto* button = new QPushButton("Generate Victim Scam Preset");
        auto* button2 = new QPushButton("Generate Elliptic2 Preset");
        auto* text = new QTextEdit();
        text->setPlainText("Schema mapping, format validation and sanitization preview. C++ core implementation is active.");

        layout->addWidget(button);
        layout->addWidget(button2);
        layout->addWidget(text);

        connect(button, &QPushButton::clicked, this, [this, text]() {
            auto ds = chainsink::generateVictimScamDataset();
            text->setPlainText(QString::fromStdString("Transactions: " + std::to_string(ds.transactions.size()) + "\nNodes: " + std::to_string(ds.nodes.size()) + "\nEdges: " + std::to_string(ds.edges.size())));
        });
        connect(button2, &QPushButton::clicked, this, [this, text]() {
            auto ds = chainsink::generateElliptic2Dataset();
            text->setPlainText(QString::fromStdString("Transactions: " + std::to_string(ds.transactions.size()) + "\nNodes: " + std::to_string(ds.nodes.size()) + "\nEdges: " + std::to_string(ds.edges.size())));
        });
        return widget;
    }

    QWidget* buildComplianceTab() {
        auto* widget = new QWidget(this);
        auto* layout = new QVBoxLayout(widget);
        auto* rootLabel = new QLabel("Current Merkle Root");
        auto* rootValue = new QLabel("0x0000000000000000000000000000000000000000000000000000000000000000");
        rootValue->setWordWrap(true);
        layout->addWidget(rootLabel);
        layout->addWidget(rootValue);
        auto* runButton = new QPushButton("Run Compliance Benchmark");
        layout->addWidget(runButton);

        connect(runButton, &QPushButton::clicked, this, [this, rootValue]() {
            auto result = engine.loadPreset("VICTIM_SCAM_PEEL");
            rootValue->setText(QString::fromStdString(result.merkleSettlement.first));
        });
        return widget;
    }

    QWidget* buildBenchmarkTab() {
        auto* widget = new QWidget(this);
        auto* layout = new QVBoxLayout(widget);
        auto* text = new QTextEdit();
        text->setPlainText("High-Throughput Topology Mining Benchmark\nParallel graph chunking and multi-worker pattern mining are implemented in the C++ core.");
        layout->addWidget(text);
        return widget;
    }

    void setSummaryText(const chainsink::ForensicPipelineRunResult& result) {
        QString text;
        text += "Case: " + QString::fromStdString(result.metadata.caseName) + "\n";
        text += "Nodes: " + QString::number(result.nodes.size()) + "\n";
        text += "Edges: " + QString::number(result.edges.size()) + "\n";
        text += "Merkle Root: " + QString::fromStdString(result.merkleSettlement.first) + "\n";
        text += "Block: " + QString::number(result.merkleSettlement.second);
        auto* editor = new QTextEdit();
        editor->setPlainText(text);
        if (tabs) {
            QWidget* canvas = tabs->widget(0);
            if (canvas) {
                auto* layout = qobject_cast<QVBoxLayout*>(canvas->layout());
                if (layout) {
                    auto* existing = layout->itemAt(1)->widget();
                    if (existing) {
                        auto* label = qobject_cast<QLabel*>(existing);
                        if (label) {
                            label->setText(text);
                        }
                    }
                }
            }
        }
    }
};

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    MainWindow window;
    window.show();
    return app.exec();
}
